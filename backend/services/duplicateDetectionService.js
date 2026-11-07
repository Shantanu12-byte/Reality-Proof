import crypto from 'crypto';
import sharp from 'sharp';
import { EvidenceFingerprint } from '../models/EvidenceFingerprint.js';
import { logger } from './logger.js';

/**
 * Calculate SHA-256 cryptographic hash of an image buffer.
 * Used for detecting byte-for-byte exact duplicate submissions.
 * @param {Buffer} buffer Image buffer
 * @returns {string} 64-character lowercase hex string
 */
export const calculateSha256 = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Compute 64-bit Perceptual Hash (pHash / dHash) using horizontal gradient analysis.
 * Converts the image to 9x8 grayscale, evaluates relative pixel gradients across adjacent columns,
 * and sets bits based on whether each pixel is brighter than its horizontal neighbor (8 rows x 8 comparisons = 64 bits).
 * 
 * Highly invariant to:
 * - Minor cropping and border resizing
 * - Slight JPEG compression artifacts
 * - Gamma, brightness and contrast shifts
 * 
 * @param {Buffer} buffer Image buffer
 * @returns {Promise<string>} 16-character hex string representing the 64-bit hash
 */
export const calculatePHash = async (buffer) => {
  try {
    // Resize to 9 width x 8 height grayscale (72 pixels)
    const rawBytes = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let binary = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = rawBytes[row * 9 + col];
        const right = rawBytes[row * 9 + col + 1];
        binary += left > right ? '1' : '0';
      }
    }

    // Convert 64-bit binary string to 16-hex characters
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = binary.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }

    return hex.padStart(16, '0');
  } catch (err) {
    // Fallback if image parsing fails (e.g. malformed buffer)
    logger.warn('pHash', `Warning computing pHash: ${err.message}`);
    const sha = calculateSha256(buffer);
    return sha.substring(0, 16);
  }
};

/**
 * Compute the Hamming distance between two hexadecimal hashes.
 * Returns the count of differing bits (0 to 64 for 16-hex characters).
 * @param {string} hashA 16-hex string
 * @param {string} hashB 16-hex string
 * @returns {number} Hamming distance in bits
 */
export const calculateHammingDistance = (hashA, hashB) => {
  if (!hashA || !hashB) return 64;
  const hexA = hashA.toLowerCase().padStart(16, '0');
  const hexB = hashB.toLowerCase().padStart(16, '0');

  let distance = 0;
  for (let i = 0; i < Math.min(hexA.length, hexB.length, 16); i++) {
    const valA = parseInt(hexA[i], 16) || 0;
    const valB = parseInt(hexB[i], 16) || 0;
    let xor = valA ^ valB;
    // Count bits set in xor
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }

  // Account for length differences if any
  const lenDiff = Math.abs(hexA.length - hexB.length);
  distance += lenDiff * 4;

  return Math.min(64, distance);
};

/**
 * Calculate similarity percentage based on Hamming distance.
 * 0 bits difference = 100% similarity
 * 64 bits difference = 0% similarity
 * @param {number} hammingDist 
 * @returns {number} 0 to 100
 */
export const hammingToSimilarity = (hammingDist) => {
  const dist = Math.max(0, Math.min(64, hammingDist));
  return Math.round(((64 - dist) / 64) * 100);
};

/**
 * Compare an image submission against historical evidence in MongoDB.
 * 
 * Returns:
 * - exactMatchFound: boolean
 * - perceptualMatchFound: boolean
 * - sha256: string
 * - pHash: string
 * - matches: Array<{ matchedTaskId, matchType, similarity, hammingDistance, ... }>
 * 
 * Rules:
 * - Exact duplicate: SHA-256 match
 * - Visually similar: Hamming distance <= 10 (similarity >= 84%)
 * - Does NOT auto-flag as fraud (caller decides risk score)
 * 
 * @param {Buffer} buffer Image buffer
 * @param {string} currentTaskId ID of current task being verified
 * @returns {Promise<object>} Duplicate detection findings
 */
export const detectDuplicateEvidence = async (buffer, currentTaskId) => {
  const sha256 = calculateSha256(buffer);
  const pHash = await calculatePHash(buffer);

  const findings = {
    exactMatchFound: false,
    perceptualMatchFound: false,
    sha256,
    pHash,
    matches: [],
  };

  try {
    // Find all historical fingerprints except ones submitted for the current task in this instant
    const historicalFingerprints = await EvidenceFingerprint.find({
      taskId: { $ne: currentTaskId },
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    for (const fp of historicalFingerprints) {
      // 1. Exact SHA-256 match
      if (fp.sha256 === sha256) {
        findings.exactMatchFound = true;
        findings.matches.push({
          matchedTaskId: fp.taskId,
          matchedVerificationId: fp.verificationId,
          matchType: 'exact',
          similarity: 100,
          hammingDistance: 0,
          matchedAt: fp.createdAt,
        });
        continue;
      }

      // 2. Perceptual pHash match
      const dist = calculateHammingDistance(pHash, fp.pHash);
      // Threshold: distance <= 10 out of 64 bits (~84.3% similarity)
      if (dist <= 10) {
        findings.perceptualMatchFound = true;
        findings.matches.push({
          matchedTaskId: fp.taskId,
          matchedVerificationId: fp.verificationId,
          matchType: 'perceptual',
          similarity: hammingToSimilarity(dist),
          hammingDistance: dist,
          matchedAt: fp.createdAt,
        });
      }
    }

    // Sort matches by similarity descending
    findings.matches.sort((a, b) => b.similarity - a.similarity);
  } catch (err) {
    logger.warn('DuplicateDetection', `Database lookup warning: ${err.message}`);
  }

  return findings;
};

/**
 * Register a fingerprint in MongoDB for future duplicate detection.
 * @param {object} params
 */
export const registerEvidenceFingerprint = async ({
  sha256,
  pHash,
  taskId,
  verificationId,
  evidenceId = '',
  imageUrl = '',
  fileSize = 0,
}) => {
  try {
    await EvidenceFingerprint.create({
      sha256,
      pHash,
      taskId,
      verificationId,
      evidenceId,
      imageUrl,
      fileSize,
    });
  } catch (err) {
    logger.warn('DuplicateDetection', `Failed to register fingerprint: ${err.message}`);
  }
};

import exifr from 'exifr';
import sharp from 'sharp';
import {
  calculateHaversineDistance,
  resolveTargetCoordinates,
} from './verificationService.js';

/**
 * Extract image metadata and EXIF telemetry from an image buffer.
 * Uses `sharp` for pixel dimensions and format, and `exifr` for camera EXIF and GPS.
 * 
 * @param {Buffer} buffer Image buffer
 * @param {object} task Target task document (for location geofence comparison)
 * @param {object} originalFile Optional file object from multer (originalname, mimetype, size)
 * @returns {Promise<object>} Standardized metadata findings
 */
export const extractImageMetadata = async (buffer, task = null, originalFile = null) => {
  const findings = {
    fileType: originalFile?.mimetype || 'image/jpeg',
    dimensions: {
      width: null,
      height: null,
    },
    fileSize: buffer?.length || originalFile?.size || 0,
    exifTimestamp: null,
    gpsCoordinates: {
      latitude: null,
      longitude: null,
    },
    distanceMeters: null,
    geoFenceStatus: 'no_gps',
    hasGps: false,
    hasExif: false,
    cameraMake: null,
    cameraModel: null,
  };

  if (!buffer || !Buffer.isBuffer(buffer)) {
    return findings;
  }

  // 1. Extract physical dimensions & format via sharp
  try {
    const sharpMeta = await sharp(buffer).metadata();
    if (sharpMeta) {
      findings.dimensions.width = sharpMeta.width || null;
      findings.dimensions.height = sharpMeta.height || null;
      if (sharpMeta.format) {
        findings.fileType = `image/${sharpMeta.format}`;
      }
    }
  } catch (err) {
    console.warn('[Metadata] Sharp metadata extraction notice:', err.message);
  }

  // 2. Extract EXIF & GPS via exifr
  try {
    const exifData = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      reviveValues: true,
    });

    if (exifData) {
      findings.hasExif = true;

      // Extract timestamp (DateTimeOriginal, CreateDate, ModifyDate)
      const dateVal =
        exifData.DateTimeOriginal ||
        exifData.CreateDate ||
        exifData.ModifyDate ||
        exifData.DateTime;

      if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        findings.exifTimestamp = dateVal;
      } else if (typeof dateVal === 'string') {
        const parsed = new Date(dateVal);
        if (!isNaN(parsed.getTime())) {
          findings.exifTimestamp = parsed;
        }
      }

      // Camera hardware tags
      if (exifData.Make) findings.cameraMake = String(exifData.Make).trim();
      if (exifData.Model) findings.cameraModel = String(exifData.Model).trim();

      // Extract GPS Coordinates
      if (
        typeof exifData.latitude === 'number' &&
        typeof exifData.longitude === 'number' &&
        !isNaN(exifData.latitude) &&
        !isNaN(exifData.longitude)
      ) {
        findings.hasGps = true;
        findings.gpsCoordinates.latitude = Number(exifData.latitude.toFixed(6));
        findings.gpsCoordinates.longitude = Number(exifData.longitude.toFixed(6));
      }
    }
  } catch (err) {
    // Non-fatal: Not all images have EXIF (e.g. screenshots, chat-shared images)
    console.warn('[Metadata] Exifr notice:', err.message);
  }

  // 3. Evaluate GPS against Task Geo-fence if GPS and Task are available
  if (findings.hasGps && task) {
    const targetCoords = resolveTargetCoordinates(task);
    const distance = calculateHaversineDistance(
      targetCoords.latitude,
      targetCoords.longitude,
      findings.gpsCoordinates.latitude,
      findings.gpsCoordinates.longitude
    );

    findings.distanceMeters = Math.round(distance);

    // Geofence tolerance is 100 meters
    if (distance <= 100) {
      findings.geoFenceStatus = 'match';
    } else {
      findings.geoFenceStatus = 'breach';
    }
  } else {
    findings.geoFenceStatus = 'no_gps';
  }

  return findings;
};

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const STREAMS_DIR = process.env.STREAMS_DIR || './streams';

if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);


export function getVideoInfo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      resolve({
        duration: Math.floor(metadata.format.duration || 0),
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        bitrate: Math.floor((metadata.format.bit_rate || 0) / 1000),
        size: metadata.format.size || 0,
      });
    });
  });
}

export async function transcodeToHLS(inputPath, movieId, onProgress) {
  const outputDir = path.join(STREAMS_DIR, movieId);
  fs.mkdirSync(outputDir, { recursive: true });

  const videoInfo = await getVideoInfo(inputPath);
  logger.info(`Iniciando transcode: ${movieId} (${videoInfo.width}x${videoInfo.height})`);

  const qualities = [
    { name: '360p', height: 360, bitrate: '500k', audioBitrate: '96k' },
  ];

  if (videoInfo.height >= 720) {
    qualities.push({ name: '720p', height: 720, bitrate: '2000k', audioBitrate: '128k' });
  }
  if (videoInfo.height >= 1080) {
    qualities.push({ name: '1080p', height: 1080, bitrate: '4500k', audioBitrate: '192k' });
  }

  for (const quality of qualities) {
    await transcodeQuality(inputPath, outputDir, quality, movieId, onProgress);
  }

  const masterPlaylist = generateMasterPlaylist(qualities, movieId);
  fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterPlaylist);

  logger.info(`Transcode completado: ${movieId}`);
  return {
    streamPath: `/streams/${movieId}/master.m3u8`,
    duration: videoInfo.duration,
    qualities: qualities.map((q) => q.name),
  };
}

function transcodeQuality(inputPath, outputDir, quality, movieId, onProgress) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `${quality.name}`);
    fs.mkdirSync(outputPath, { recursive: true });

    const playlistPath = path.join(outputPath, 'playlist.m3u8');
    const segmentPattern = path.join(outputPath, 'segment%03d.ts');

    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=-2:${quality.height}`,
        '-c:v libx264',
        '-preset fast',               
        '-profile:v baseline',        
        '-level 3.0',
        `-b:v ${quality.bitrate}`,
        `-maxrate ${quality.bitrate}`,
        `-bufsize ${parseInt(quality.bitrate) * 2}k`,
        '-c:a aac',
        `-b:a ${quality.audioBitrate}`,
        '-ar 44100',
        '-ac 2',
        '-f hls',
        '-hls_time 6',              
        '-hls_playlist_type vod',
        '-hls_segment_type mpegts',
        `-hls_segment_filename ${segmentPattern}`,
        '-hls_flags independent_segments',
      ])
      .output(playlistPath)
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(Math.floor(progress.percent));
        }
      })
      .on('end', () => {
        logger.info(`Calidad ${quality.name} completada para ${movieId}`);
        resolve();
      })
      .on('error', (err) => {
        logger.error(`Error transcodificando ${quality.name} para ${movieId}:`, err.message);
        reject(err);
      })
      .run();
  });
}

function generateMasterPlaylist(qualities, movieId) {
  const bitrateMap = {
    '360p': { bandwidth: 628000, resolution: '640x360' },
    '720p': { bandwidth: 2128000, resolution: '1280x720' },
    '1080p': { bandwidth: 4628000, resolution: '1920x1080' },
  };

  let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  for (const quality of qualities) {
    const info = bitrateMap[quality.name];
    if (info) {
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${info.bandwidth},RESOLUTION=${info.resolution},CODECS="avc1.42e01e,mp4a.40.2",NAME="${quality.name}"\n`;
      playlist += `${quality.name}/playlist.m3u8\n\n`;
    }
  }

  return playlist;
}


export async function deleteMovieFiles(movieId, originalFile) {
  try {
    const streamDir = path.join(STREAMS_DIR, movieId);
    if (fs.existsSync(streamDir)) {
      fs.rmSync(streamDir, { recursive: true, force: true });
    }

    if (originalFile && fs.existsSync(originalFile)) {
      fs.unlinkSync(originalFile);
    }

    logger.info(`Archivos eliminados: ${movieId}`);
  } catch (error) {
    logger.error(`Error eliminando archivos de ${movieId}:`, error.message);
  }
}

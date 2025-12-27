import { createWorker, Worker } from 'tesseract.js';

let worker: Worker | null = null;

export async function initOCR(): Promise<Worker> {
    if (worker) return worker;

    worker = await createWorker('eng');
    return worker;
}

export async function extractTextFromImage(imageData: string): Promise<string> {
    const ocrWorker = await initOCR();
    const result = await ocrWorker.recognize(imageData);
    return result.data.text;
}

export async function captureFrameFromVideo(video: HTMLVideoElement): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/png');
}

export function cleanOCRText(text: string): string {
    // Remove excessive whitespace and clean up OCR artifacts
    return text
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s.,!?;:'"()\-=+*/\\<>{}[\]@#$%^&|`~]/g, '')
        .trim();
}

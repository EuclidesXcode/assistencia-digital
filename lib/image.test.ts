
import { processImage } from './image';

describe('Image Lib', () => {
    // Mock global objects
    const originalImage = global.Image;
    const originalFileReader = global.FileReader;
    const originalDocumentHeaders = typeof document !== 'undefined' ? document.createElement : undefined;

    beforeEach(() => {
        // Reset mocks for each test if needed
    });

    afterAll(() => {
        global.Image = originalImage;
        global.FileReader = originalFileReader;
        if (originalDocumentHeaders && typeof document !== 'undefined') {
            (document.createElement as any).mockRestore();
        } else {
            // @ts-ignore
            delete global.document;
        }
    });

    it('should process image successfully', async () => {
        global.Image = class {
            onload: () => void = () => { };
            onerror: () => void = () => { };
            src: string = '';
            width: number = 1000;
            height: number = 1000;
            constructor() {
                setTimeout(() => this.onload(), 10);
            }
        } as any;

        global.FileReader = class {
            onload: (e: any) => void = () => { };
            onerror: (e: any) => void = () => { };
            readAsDataURL() {
                setTimeout(() => this.onload({ target: { result: 'base64' } }), 10);
            }
        } as any;

        // Mock Canvas
        // @ts-ignore
        if (typeof document === 'undefined') {
            // @ts-ignore
            global.document = {
                createElement: (tag: string) => {
                    if (tag === 'canvas') {
                        return {
                            width: 0,
                            height: 0,
                            getContext: () => ({ drawImage: jest.fn() }),
                            toBlob: (cb: any) => cb(new Blob(['test'], { type: 'image/jpeg' })),
                        } as any;
                    }
                    return {};
                }
            } as any;
        }

        const file = new File(['content'], 'test.png', { type: 'image/png' });
        const procesed = await processImage(file);
        expect(procesed).toBeDefined();
    });

    it('should handle image load error', async () => {
        global.FileReader = class {
            onload: (e: any) => void = () => { };
            readAsDataURL() {
                setTimeout(() => this.onload({ target: { result: 'base64' } }), 10);
            }
        } as any;

        global.Image = class {
            onerror: (e: any) => void = () => { };
            constructor() {
                setTimeout(() => this.onerror(new Error('Load error')), 10);
            }
        } as any;

        const file = new File(['content'], 'test.png', { type: 'image/png' });
        await expect(processImage(file)).rejects.toBeDefined(); // It rejects with event usually
    });

    it('should handle file reader error', async () => {
        global.FileReader = class {
            onerror: (e: any) => void = () => { };
            readAsDataURL() {
                setTimeout(() => this.onerror(new Error('Read error')), 10);
            }
        } as any;

        const file = new File(['content'], 'test.png', { type: 'image/png' });
        await expect(processImage(file)).rejects.toBeDefined();
    });

    it('should return original file if not an image', async () => {
        const file = new File(['content'], 'test.txt', { type: 'text/plain' });
        const procesed = await processImage(file);
        expect(procesed).toBe(file);
    });
});

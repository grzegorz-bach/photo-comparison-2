import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Difference {
  description: string;
  boundingBox: [[number, number, number, number], [number, number, number, number]];
}

interface ComparisonResult {
  summary: string;
  differences: Difference[];
}

const App = () => {
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [image1URL, setImage1URL] = useState<string | null>(null);
  const [image2URL, setImage2URL] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const canvas1Ref = useRef<HTMLCanvasElement | null>(null);
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null);

  const drawDifferences = (
    canvas: HTMLCanvasElement,
    imageURL: string,
    differences: Difference[],
    imageIndex: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const img = new Image();
      img.src = imageURL;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = 'red';
        differences.forEach((diff) => {
          const boundingBox = diff.boundingBox[imageIndex];
          if (boundingBox) {
            const [x, y, width, height] = boundingBox;
            const centerX = (x / 100 + (width / 100) / 2) * canvas.width;
            const centerY = (y / 100 + (height / 100) / 2) * canvas.height;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      };
    }
  };

  useEffect(() => {
    if (result && image1URL && canvas1Ref.current) {
      drawDifferences(canvas1Ref.current, image1URL, result.differences, 0);
    }
  }, [result, image1URL]);

  useEffect(() => {
    if (result && image2URL && canvas2Ref.current) {
      drawDifferences(canvas2Ref.current, image2URL, result.differences, 1);
    }
  }, [result, image2URL]);

  const handleImage1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      setImage1(file);
      setImage1URL(URL.createObjectURL(file));
    }
  };

  const handleImage2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      setImage2(file);
      setImage2URL(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!image1 || !image2) {
      alert('Please upload both images.');
      return;
    }

    setLoading(true);
    setResult(null);

    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    const toBase64 = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });

    try {
      const [imageBase64_1, imageBase64_2] = await Promise.all([
        toBase64(image1),
        toBase64(image2),
      ]);

      const imageParts = [
        {
          inlineData: {
            mimeType: image1.type,
            data: imageBase64_1,
          },
        },
        {
          inlineData: {
            mimeType: image2.type,
            data: imageBase64_2,
          },
        },
      ];

      const prompt =
        'Compare these two images and describe the differences. For each difference, provide a bounding box as an array of [x, y, width, height] as percentages on both images. The response should be a JSON object with two keys: "summary" (a string) and "differences" (an array of objects, each with a "description" and a "boundingBox" array).';

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const parsedResult: ComparisonResult = JSON.parse(jsonString);

      setResult(parsedResult);
    } catch (error) {
      console.error(error);
      alert('An error occurred while processing the images.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Image Comparison</h1>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div>
          <label htmlFor="image1">Image 1</label>
          <input
            type="file"
            id="image1"
            accept="image/*"
            onChange={handleImage1Change}
          />
        </div>
        <div>
          <label htmlFor="image2">Image 2</label>
          <input
            type="file"
            id="image2"
            accept="image/*"
            onChange={handleImage2Change}
          />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: '1rem' }}>
        {loading ? 'Comparing...' : 'Compare Images'}
      </button>
      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Comparison Result:</h2>
          <p>{result.summary}</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h3>Image 1 with Differences</h3>
              <canvas ref={canvas1Ref} style={{ maxWidth: '100%', height: 'auto' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>Image 2 with Differences</h3>
              <canvas ref={canvas2Ref} style={{ maxWidth: '100%', height: 'auto' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
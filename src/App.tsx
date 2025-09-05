import { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Box,
  AppBar,
  Toolbar,
  createTheme,
  ThemeProvider,
  CssBaseline,
  useMediaQuery,
  Snackbar,
  Alert,
} from '@mui/material';
import CameraIcon from '@mui/icons-material/Camera';
import ImageIcon from '@mui/icons-material/Image';

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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');


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
            ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
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
      setSnackbarMessage('Please upload both images.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
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
    } catch (error: any) {
      console.error(error);
      if (error.message.includes('503')) {
        setSnackbarMessage('The model is currently overloaded. Please try again later.');
      } else {
        setSnackbarMessage('An error occurred while processing the images.');
      }
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode],
  );

  const ImagePlaceholder = () => (
    <Box
      sx={{
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'action.hover',
        borderRadius: 1,
        mt: 2,
      }}
    >
      <ImageIcon sx={{ fontSize: 50, color: 'text.disabled' }} />
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky">
        <Toolbar>
          <CameraIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Image Comparison</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box
          display="grid"
          gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }}
          gap={4}
        >
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Image 1
              </Typography>
              <Button variant="contained" component="label">
                Upload Image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImage1Change}
                />
              </Button>
              {image1URL ? (
                <Box mt={2}>
                  <img src={image1URL} alt="Image 1" style={{ maxWidth: '100%' }} />
                </Box>
              ) : (
                <ImagePlaceholder />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Image 2
              </Typography>
              <Button variant="contained" component="label">
                Upload Image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImage2Change}
                />
              </Button>
              {image2URL ? (
                <Box mt={2}>
                  <img src={image2URL} alt="Image 2" style={{ maxWidth: '100%' }} />
                </Box>
              ) : (
                <ImagePlaceholder />
              )}
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={loading || !image1 || !image2}
          >
            {loading ? <CircularProgress size={24} /> : 'Compare Images'}
          </Button>
        </Box>
        {result && (
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Comparison Result
              </Typography>
              <Typography variant="body1">{result.summary}</Typography>
              <Box
                display="grid"
                gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }}
                gap={4}
                sx={{ mt: 2 }}
              >
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Image 1 with Differences
                  </Typography>
                  <canvas ref={canvas1Ref} style={{ maxWidth: '100%', height: 'auto' }} />
                </Box>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Image 2 with Differences
                  </Typography>
                  <canvas ref={canvas2Ref} style={{ maxWidth: '100%', height: 'auto' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App;
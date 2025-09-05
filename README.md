# Photo Comparison Tool

A web application for comparing two images and highlighting their differences using AI.

## Features

*   **Upload two images:** Select two images from your local machine.
*   **AI-powered comparison:** Uses the Google Gemini model to analyze and compare the two images.
*   **Visual highlighting:** Displays the differences as highlighted regions on the original images.
*   **Text summary:** Provides a text description of the differences found.
*   **Responsive design:** Works on both desktop and mobile devices.

## Tech Stack

*   **Frontend:** React, TypeScript
*   **UI:** Material-UI
*   **AI:** Google Gemini API
*   **Build Tool:** Vite

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/photo-comparison-2.git
    cd photo-comparison-2
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the root of the project and add your Google Gemini API key:

```
VITE_GEMINI_API_KEY=your-api-key
```

### Running the Application

```bash
npm run dev
```

This will start the development server at `http://localhost:5173`.

## Usage

1.  **Open the application:** Once the development server is running, open your web browser and navigate to `http://localhost:5173`.

2.  **Upload the first image:** In the "Image 1" card, click the "Upload Image" button. This will open a file dialog. Select the first image you want to compare.

3.  **Upload the second image:** In the "Image 2" card, click the "Upload Image" button and select the second image.

4.  **Start the comparison:** After both images are uploaded, click the "Compare Images" button located between the two image sections.

5.  **View the results:** The comparison process may take a few moments. Once complete, the results will appear below the "Compare Images" button. You will see:
    *   A **summary** of the differences between the two images.
    *   The two original images with the detected differences **highlighted by red circles**.
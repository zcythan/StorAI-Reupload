import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import './PDFViewer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const PDFViewer = ({ file }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scaleWidth, setScaleWidth] = useState(1);
  const [scaleHeight, setScaleHeight] = useState(1);

  useEffect(() => {
    const newScaleWidth = calculateScaleWidth();
    const newScaleHeight = calculateScaleHeight();
    setScaleWidth(newScaleWidth);
    setScaleHeight(newScaleHeight);
  }, []);

  const calculateScaleWidth = () => {
    const scale = window.innerWidth / 960;
    return scale;
  };

  const calculateScaleHeight = () => {
    const scale = window.innerHeight / 720;
    return scale;
  };

  const onDocumentLoadSuccess = ({ numPages: loadedNumPages }) => {
    setNumPages(loadedNumPages);
    // Update scale when the document is loaded
    setScaleWidth(calculateScaleWidth());
    setScaleHeight(calculateScaleHeight());
  };

  const goToPrevPage = () => {
    setPageNumber(pageNumber > 1 ? pageNumber - 1 : 1);
  };
  
  const goToNextPage = () => {
    setPageNumber(pageNumber < numPages ? pageNumber + 1 : numPages);
  };

  // Smaller scale to ensure the PDF fits within the container
  const scale = Math.min(scaleWidth, scaleHeight);

  return (
    <>
      <div className="pdf-container">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          className="pdf-viewer"
        >
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
      {numPages > 1 && ( // Only render if there's more than one page
        <div className="navigation-buttons">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="navigation-button"
          >
            Prev
          </button>
          <span>Page {pageNumber} of {numPages}</span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="navigation-button"
          >
            Next
          </button>
        </div>
      )}
    </>
  );  
};

export default PDFViewer;

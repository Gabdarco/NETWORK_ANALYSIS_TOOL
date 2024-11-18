import React, { useState, useEffect } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import ClipLoader from 'react-spinners/ClipLoader'; // Import spinner
import './Letter.css'; // Ensure this CSS is used for proper layout

const Letter = ({ file }) => {
  let { internalPDFname, abstract } = file;
  const [isClosed, setIsClosed] = useState(false);
  const [pdfURL, setPdfURL] = useState('');
  const [letterExists, setLetterExists] = useState(false);
  const [transcriptExists, setTranscriptExists] = useState(false);
  const [transcriptURL, setTranscriptURL] = useState('');
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    if (internalPDFname.includes(',')) {
      internalPDFname = internalPDFname.split(',')[0];
    }
    console.log('internalPDFname:', internalPDFname);
    // Fetch the letter (or transcript) by id
    const fetchPDF = async () => {
      try {
        setLoading(true); // Start loading
        const baseExpressUrl = process.env.REACT_APP_BASEEXPRESSURL;
        const url = `${baseExpressUrl}pdf/${internalPDFname}`; // Corrected URL path
        console.log(url);
        const transcriptUrl = `${baseExpressUrl}pdf/${internalPDFname.replace('_1.pdf', '_transcript.pdf')}`; // Corrected URL path
        // console.log('fetching PDF:', url);
        const letterResponse = await fetch(url);
        const transcriptResponse = await fetch(transcriptUrl);
        // console.log('letterResponse', letterResponse);
        if (letterResponse.ok) {
          setPdfURL(url);  // No need to hardcode again, just reuse the same url
          setLetterExists(true);
        } else {
          // console.log('PDF not found or server returned an error.');
        }

        if (transcriptResponse.ok) {
          setTranscriptURL(transcriptUrl);
          setTranscriptExists(true);
        } else {
          // console.log('Transcript not found or server returned an error.');
        }
      } catch (error) {
        // console.error('Error fetching PDF:', error);
      } finally {
        setLoading(false); // Stop loading when finished
      }
    };

    fetchPDF();
  }, [internalPDFname]);  // Ensure `[internalPDFname]` is in the dependency array if you're fetching based on the `internalPDFname` prop


  const handleResizeEnd = (e) => {
    if (e.sizes[0] === 0 || e.sizes[1] === 0) {
      setIsClosed(true);
    } else {
      setIsClosed(false);
    }
  };

  return (
    <div className='letterSplitter'>
      {loading ? ( // Show loading spinner while fetching
        <div className="spinner-wrapper">
          <ClipLoader color="#36d7b7" loading={loading} size={150} />
        </div>
      ) : letterExists || transcriptExists ? (
        letterExists && transcriptExists ? (
          <Splitter className='letterSplitter' onResizeEnd={handleResizeEnd}>
            <SplitterPanel
              className={`flex align-items-center justify-content-center letterSplitterPanel ${isClosed ? 'closed' : ''}`}
              minSize={0}
            >
              <iframe
                src={pdfURL}
                width="100%"
                height="100%"
                title={`Letter ${internalPDFname}`}
              ></iframe>
            </SplitterPanel>
            <SplitterPanel
              className={`flex align-items-center justify-content-center letterSplitterPanel ${isClosed ? 'closed' : ''}`}
              style={{ flexDirection: 'column' }}
              minSize={0}
            >
              <iframe
                src={transcriptURL}
                width="100%"
                height="100%"
                title={`Transcription ${internalPDFname}`}
              ></iframe>
            </SplitterPanel>
          </Splitter>
        ) : (
          <div style={{ height: '100%', width: '100%' }} className="flex align-items-center justify-content-center">
            {letterExists ? (
              <iframe
                src={pdfURL}
                width="100%"
                height="100%"
                style={{ flex: 1 }}
                title={`Letter ${internalPDFname}`}
              ></iframe>
            ) : (
              transcriptExists && (
                <iframe
                  src={transcriptURL}
                  width="100%"
                  height="100%"
                  style={{ flex: 1 }}
                  title={`Transcription ${internalPDFname}`}
                ></iframe>
              )
            )}
          </div>
        )
      ) : (

<div >
  <div>
    <strong>Document ID:</strong> {file.importID}
  </div>
  {file.connections && file.connections[0] && file.connections[0].roleName === 'Sender' ? (
    <div><strong>From:</strong> {file.connections[0].personFullName}</div>
  ) : (
    file.sender ? (
      <div><strong>From:</strong> {file.sender}</div>
    ) : (
      file.author && <div><strong>From:</strong> {file.author}</div>
    )
  )}
  {file.connections && file.connections[1] && file.connections[1].roleName === 'Receiver' ? (
    <div><strong>To:</strong> {file.connections[1].personFullName}</div>
  ) : (
    file.receiver && <div><strong>To:</strong> {file.receiver}</div>
  )}
  <div>
    <strong>Date:</strong> {file.date ? file.date : file.sortingDate}
  </div>

  {file.abstract && (
  <div>
    <strong>Abstract:</strong> {file.abstract}
  </div>
)}</div>
      )}
    </div>
  );
};

export default Letter;
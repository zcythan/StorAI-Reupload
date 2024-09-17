import React from 'react';
import ReactPlayer from 'react-player';
import './VideoPlayer.css';

const VideoPlayer = ({ src }) => {
  return (
    <div className="video-player-container">
      <ReactPlayer
        url={src}
        controls={true}
        width="100%"
        height="100%"
        className="video-player"
      />
    </div>
  );
};

export default VideoPlayer;

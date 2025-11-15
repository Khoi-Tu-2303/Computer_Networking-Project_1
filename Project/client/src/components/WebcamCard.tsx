import { useState } from 'react';
import { Video, Eye, Circle, Square } from 'lucide-react';

export default function WebcamCard() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleViewStream = () => {
    setIsStreaming(!isStreaming);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Video className="w-5 h-5" />
        Webcam / Record
      </h3>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleViewStream}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isStreaming
              ? 'bg-gray-600 hover:bg-gray-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          <Eye className="w-4 h-4" />
          {isStreaming ? 'Hide Stream' : 'View Stream'}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleStartRecording}
          disabled={isRecording || !isStreaming}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Circle className="w-4 h-4" />
          Start Recording
        </button>
        <button
          onClick={handleStopRecording}
          disabled={!isRecording}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Square className="w-4 h-4" />
          Stop Recording
        </button>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 min-h-[300px] flex items-center justify-center relative">
        {isStreaming ? (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Live Stream Active</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Stream not active</p>
        )}
        {isRecording && (
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="text-xs font-medium">REC</span>
          </div>
        )}
      </div>
    </div>
  );
}

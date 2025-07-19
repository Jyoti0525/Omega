import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaImage, FaVideo, FaFile, FaTimes, FaCheck, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { uploadFileWithProgress, utils } from '../../utils/api';

const FileUpload = ({ onFileUpload, onClose, acceptedTypes = ['image', 'video', 'document'] }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // File type configurations
  const fileTypeConfig = {
    image: {
      accept: 'image/*',
      maxSize: 5 * 1024 * 1024, // 5MB
      icon: FaImage,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    video: {
      accept: 'video/*',
      maxSize: 50 * 1024 * 1024, // 50MB
      icon: FaVideo,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    document: {
      accept: '.pdf,.doc,.docx,.txt',
      maxSize: 10 * 1024 * 1024, // 10MB
      icon: FaFile,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  };

  // Create accept string for dropzone
  const acceptString = acceptedTypes.reduce((acc, type) => {
    return { ...acc, [fileTypeConfig[type].accept]: [] };
  }, {});

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error) => {
        if (error.code === 'file-too-large') {
          toast.error(`File "${file.name}" is too large`);
        } else if (error.code === 'file-invalid-type') {
          toast.error(`File "${file.name}" type is not supported`);
        } else {
          toast.error(`Error with file "${file.name}": ${error.message}`);
        }
      });
    });

    // Process accepted files
    const processedFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: utils.getFileType(file.type),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending' // pending, uploading, completed, error
    }));

    setFiles(prev => [...prev, ...processedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptString,
    maxSize: 50 * 1024 * 1024, // 50MB max
    multiple: true
  });

  // Remove file from list
  const removeFile = (id) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  // Upload single file
  const uploadFile = async (fileData) => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'uploading' } : f
      ));

      const response = await uploadFileWithProgress(
        fileData.file,
        fileData.type,
        (progress) => {
          setUploadProgress(prev => ({ ...prev, [fileData.id]: progress }));
        }
      );

      if (response.data.success) {
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'completed', uploadData: response.data.data } : f
        ));
        
        // Call the callback with upload data
        if (onFileUpload) {
          onFileUpload(response.data.data);
        }

        toast.success(`${fileData.name} uploaded successfully`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'error' } : f
      ));
      toast.error(`Failed to upload ${fileData.name}`);
    }
  };

  // Upload all files
  const uploadAllFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');

    for (const fileData of pendingFiles) {
      await uploadFile(fileData);
    }

    setUploading(false);
  };

  // Get file type icon and styling
  const getFileIcon = (type) => {
    const config = fileTypeConfig[type];
    const IconComponent = config?.icon || FaFile;
    return {
      icon: IconComponent,
      ...config
    };
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheck className="h-4 w-4 text-green-600" />;
      case 'error':
        return <FaTimes className="h-4 w-4 text-red-600" />;
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`file-upload-area ${isDragActive ? 'dragover' : ''} mb-6`}
          >
            <input {...getInputProps()} />
            <FaCloudUploadAlt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to select files
            </p>
            
            {/* Supported formats */}
            <div className="flex flex-wrap justify-center gap-2">
              {acceptedTypes.map(type => {
                const { icon: Icon, color } = getFileIcon(type);
                return (
                  <div key={type} className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${color}`}>
                    <Icon className="h-3 w-3" />
                    <span className="capitalize">{type}s</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Selected Files ({files.length})</h4>
              
              {files.map((fileData) => {
                const { icon: Icon, color, bgColor, borderColor } = getFileIcon(fileData.type);
                const progress = uploadProgress[fileData.id] || 0;
                
                return (
                  <div key={fileData.id} className={`border ${borderColor} ${bgColor} rounded-lg p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <Icon className={`h-6 w-6 ${color}`} />
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileData.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {utils.formatFileSize(fileData.size)} • {fileData.type}
                          </p>
                        </div>

                        {/* Preview for images */}
                        {fileData.preview && (
                          <img
                            src={fileData.preview}
                            alt="Preview"
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {getStatusIcon(fileData.status)}
                        
                        {fileData.status === 'pending' && (
                          <button
                            onClick={() => removeFile(fileData.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <FaTimes className="h-4 w-4" />
                          </button>
                        )}

                        {fileData.status === 'completed' && fileData.uploadData && (
                          <a
                            href={fileData.uploadData.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <FaDownload className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {fileData.status === 'uploading' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Uploading...</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="upload-progress">
                          <div 
                            className="upload-progress-bar"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {fileData.status === 'error' && (
                      <div className="mt-2 text-xs text-red-600">
                        Upload failed. Please try again.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {files.filter(f => f.status === 'completed').length} of {files.length} files uploaded
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setFiles([])}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              
              <button
                onClick={uploadAllFiles}
                disabled={uploading || files.filter(f => f.status === 'pending').length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'pending').length} Files`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
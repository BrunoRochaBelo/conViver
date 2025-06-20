using System;
using System.IO;
using System.Threading.Tasks;
using conViver.Core.Interfaces;
using Microsoft.AspNetCore.Hosting; // Required for IWebHostEnvironment
using Microsoft.Extensions.Logging; // Required for ILogger

namespace conViver.Infrastructure.Services
{
    public class LocalStorageService : IFileStorageService
    {
        private readonly string _storagePath;
        private readonly ILogger<LocalStorageService> _logger;
        private readonly string _baseAppUrl; // To construct accessible URLs

        // It's better to get base URL from configuration for flexibility
        public LocalStorageService(IWebHostEnvironment env, ILogger<LocalStorageService> logger, string baseAppUrl = "http://localhost:5000")
        {
            // Define a base path, e.g., in wwwroot/uploads or a configured path outside wwwroot
            // For simplicity, using a folder 'uploads' inside wwwroot.
            // Ensure this path is configured and accessible by the application.
            // In a real app, this path should come from configuration.
            _storagePath = Path.Combine(env.WebRootPath ?? env.ContentRootPath, "uploads");
            if (!Directory.Exists(_storagePath))
            {
                Directory.CreateDirectory(_storagePath);
            }
            _logger = logger;
            _baseAppUrl = baseAppUrl.TrimEnd('/'); // Ensure no trailing slash
        }

        public async Task<string> UploadFileAsync(string containerName, string originalFileName, Stream contentStream, string contentType)
        {
            try
            {
                var containerPath = Path.Combine(_storagePath, containerName);
                if (!Directory.Exists(containerPath))
                {
                    Directory.CreateDirectory(containerPath);
                }

                // Generate a unique file name to prevent overwrites and sanitize
                var fileExtension = Path.GetExtension(originalFileName);
                var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(containerPath, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write))
                {
                    await contentStream.CopyToAsync(fileStream);
                }

                // Construct a URL that can be used to access the file
                // This URL needs to be accessible from the client.
                // If 'uploads' is within wwwroot, it might be directly servable by static files middleware.
                // Example: http://localhost:5000/uploads/containerName/uniqueFileName.ext
                var fileUrl = $"{_baseAppUrl}/uploads/{containerName}/{uniqueFileName}";
                _logger.LogInformation("File uploaded successfully to {FilePath}. Accessible at {FileUrl}", filePath, fileUrl);
                return fileUrl;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file {FileName} to container {ContainerName}", originalFileName, containerName);
                throw; // Re-throw or handle as custom exception
            }
        }

        public Task DeleteFileAsync(string fileUrl)
        {
            try
            {
                // This is a simplified deletion. Robust implementation would need to parse URL,
                // ensure it's a local file, and handle security (e.g., prevent deleting outside _storagePath).
                if (string.IsNullOrEmpty(fileUrl) || !fileUrl.StartsWith(_baseAppUrl + "/uploads/"))
                {
                    _logger.LogWarning("Attempted to delete invalid or non-local file URL: {FileUrl}", fileUrl);
                    return Task.CompletedTask; // Or throw ArgumentException
                }

                // Extract local path from URL
                var relativePath = fileUrl.Substring((_baseAppUrl + "/uploads/").Length);
                // Sanitize relativePath to prevent directory traversal attacks (e.g. "..", "/")
                relativePath = relativePath.Replace("..", "").TrimStart('/');
                var filePath = Path.Combine(_storagePath, relativePath);


                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    _logger.LogInformation("File deleted successfully: {FilePath}", filePath);
                }
                else
                {
                    _logger.LogWarning("File not found for deletion: {FilePath}", filePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file {FileUrl}", fileUrl);
                // Decide if to throw or just log
            }
            return Task.CompletedTask;
        }
    }
}

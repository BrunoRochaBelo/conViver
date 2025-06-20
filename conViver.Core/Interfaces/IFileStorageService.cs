using System.IO;
using System.Threading.Tasks;

namespace conViver.Core.Interfaces
{
    public interface IFileStorageService
    {
        Task<string> UploadFileAsync(string containerName, string fileName, Stream contentStream, string contentType);
        Task DeleteFileAsync(string fileUrl); // Assuming URL might be enough to locate/delete
    }
}

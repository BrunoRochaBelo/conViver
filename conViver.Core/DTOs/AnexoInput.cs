using System.IO;

namespace conViver.Core.DTOs
{
    public class AnexoInput
    {
        public string FileName { get; set; }
        public string ContentType { get; set; }
        public Stream ContentStream { get; set; }

        public AnexoInput(string fileName, string contentType, Stream contentStream)
        {
            FileName = fileName;
            ContentType = contentType;
            ContentStream = contentStream;
        }
    }
}

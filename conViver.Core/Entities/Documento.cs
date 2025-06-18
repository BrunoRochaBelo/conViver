namespace conViver.Core.Entities;

public class Documento
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTime UploadEm { get; set; } = DateTime.UtcNow;
}

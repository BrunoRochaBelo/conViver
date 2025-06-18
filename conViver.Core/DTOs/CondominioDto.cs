namespace conViver.Core.DTOs;

public class CondominioDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
}

public class CreateCondominioRequest
{
    public string Nome { get; set; } = string.Empty;
}

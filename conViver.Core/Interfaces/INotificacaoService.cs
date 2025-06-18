namespace conViver.Core.Interfaces;

public interface INotificacaoService
{
    Task SendAsync(string destino, string mensagem, CancellationToken cancellationToken = default);
}

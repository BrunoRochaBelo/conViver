namespace conViver.Core.Notifications;

public record NotificationMessage(string Tipo, Guid? UsuarioId, string Titulo, string Corpo);

using FluentValidation;
using conViver.Core.DTOs;

namespace conViver.Application;

public class UsuarioValidator : AbstractValidator<SignupRequest>
{
    public UsuarioValidator()
    {
        RuleFor(u => u.Nome)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(u => u.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(u => u.Senha)
            .NotEmpty()
            .MinimumLength(8);
    }
}


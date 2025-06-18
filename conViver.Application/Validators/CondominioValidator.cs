using FluentValidation;
using conViver.Core.DTOs;

namespace conViver.Application;

public class CondominioValidator : AbstractValidator<CreateCondominioRequest>
{
    public CondominioValidator()
    {
        RuleFor(c => c.Nome)
            .NotEmpty()
            .MaximumLength(120);
    }
}


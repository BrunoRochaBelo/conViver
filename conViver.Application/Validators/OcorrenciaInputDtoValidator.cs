using FluentValidation;
using conViver.Core.DTOs;
using conViver.Core.Enums;

namespace conViver.Application.Validators
{
    public class OcorrenciaInputDtoValidator : AbstractValidator<OcorrenciaInputDto>
    {
        public OcorrenciaInputDtoValidator()
        {
            RuleFor(x => x.Titulo)
                .NotEmpty().WithMessage("O título é obrigatório.")
                .MaximumLength(100).WithMessage("O título não pode exceder 100 caracteres.");

            RuleFor(x => x.Descricao)
                .NotEmpty().WithMessage("A descrição é obrigatória.")
                .MaximumLength(1000).WithMessage("A descrição não pode exceder 1000 caracteres.");

            RuleFor(x => x.Categoria)
                .NotEmpty().WithMessage("A categoria é obrigatória.")
                .IsInEnum().WithMessage("Categoria inválida.");

            RuleFor(x => x.Prioridade)
                .IsInEnum().WithMessage("Prioridade inválida.");

            // Assuming Anexos are handled separately and their validation might occur elsewhere
            // or if AnexoInput was part of OcorrenciaInputDto, it would be validated here too.
        }
    }
}

using FluentValidation;
using conViver.Core.DTOs;

namespace conViver.Application.Validators
{
    public class OcorrenciaComentarioInputDtoValidator : AbstractValidator<OcorrenciaComentarioInputDto>
    {
        public OcorrenciaComentarioInputDtoValidator()
        {
            RuleFor(x => x.Texto)
                .NotEmpty().WithMessage("O texto do comentário é obrigatório.")
                .MaximumLength(500).WithMessage("O comentário não pode exceder 500 caracteres.");
        }
    }
}

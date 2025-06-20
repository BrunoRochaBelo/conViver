using FluentValidation;
using conViver.Core.DTOs;
using conViver.Core.Enums;

namespace conViver.Application.Validators
{
    public class OcorrenciaStatusInputDtoValidator : AbstractValidator<OcorrenciaStatusInputDto>
    {
        public OcorrenciaStatusInputDtoValidator()
        {
            RuleFor(x => x.Status)
                .NotEmpty().WithMessage("O status é obrigatório.")
                .IsInEnum().WithMessage("Status inválido.");
        }
    }
}

using System;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

// DTO para Endereço, pode ser um Value Object na entidade ou um DTO separado.
public class EnderecoDto
{
    [Required(ErrorMessage = "O logradouro é obrigatório.")]
    [StringLength(200)]
    public string Logradouro { get; set; } = string.Empty;

    [Required(ErrorMessage = "O número é obrigatório.")]
    [StringLength(20)]
    public string Numero { get; set; } = string.Empty;

    [StringLength(100)]
    public string? Complemento { get; set; }

    [Required(ErrorMessage = "O bairro é obrigatório.")]
    [StringLength(100)]
    public string Bairro { get; set; } = string.Empty;

    [Required(ErrorMessage = "A cidade é obrigatória.")]
    [StringLength(100)]
    public string Cidade { get; set; } = string.Empty;

    [Required(ErrorMessage = "O estado (UF) é obrigatório.")]
    [StringLength(2, MinimumLength = 2, ErrorMessage = "UF deve ter 2 caracteres.")]
    public string UF { get; set; } = string.Empty;

    [Required(ErrorMessage = "O CEP é obrigatório.")]
    [StringLength(9, MinimumLength = 8, ErrorMessage = "CEP inválido.")] // Ex: 12345-678 ou 12345678
    public string CEP { get; set; } = string.Empty;
}

public class CondominioInputDto // Usado para Create e Update
{
    [Required(ErrorMessage = "O nome do condomínio é obrigatório.")]
    [StringLength(150, MinimumLength = 3, ErrorMessage = "O nome deve ter entre 3 e 150 caracteres.")]
    public string Nome { get; set; } = string.Empty;

    [StringLength(18, ErrorMessage = "CNPJ inválido.")] // Ex: XX.XXX.XXX/0001-XX
    public string? CNPJ { get; set; }

    [Required(ErrorMessage = "O endereço do condomínio é obrigatório.")]
    public EnderecoDto Endereco { get; set; } = new EnderecoDto();

    [Phone(ErrorMessage = "Telefone de contato inválido.")]
    public string? TelefoneContato { get; set; }

    [EmailAddress(ErrorMessage = "E-mail de contato inválido.")]
    public string? EmailContato { get; set; }

    public bool Ativo { get; set; } = true;
}

public class CondominioDto // Para GetById e ListAll
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? CNPJ { get; set; }
    public EnderecoDto Endereco { get; set; } = new EnderecoDto();
    public string? TelefoneContato { get; set; }
    public string? EmailContato { get; set; }
    public bool Ativo { get; set; }
    public DateTime DataCadastro { get; set; }
    // public int QuantidadeUnidades { get; set; } // Exemplo de informação adicional
    // public Guid AdministradoraId { get; set; } // Se houver vínculo com plataforma de administradora
}

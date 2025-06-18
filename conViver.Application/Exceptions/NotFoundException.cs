// conViver.Application/Exceptions/NotFoundException.cs
using System;

namespace conViver.Application.Exceptions
{
    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message)
        {
        }

        public NotFoundException(string name, object key)
            : base($"Entidade \"{name}\" ({key}) não foi encontrada.")
        {
        }
    }
}

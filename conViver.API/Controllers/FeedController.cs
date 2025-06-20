using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace conViver.API.Controllers
{
    [ApiController]
    [Route("/api/v1/feed")]
    [Authorize(Roles = "Syndic,Resident,Tenant")] // Using roles consistent with other controllers
    public class FeedController : ControllerBase
    {
        private readonly FeedService _feedService;

        public FeedController(FeedService feedService)
        {
            _feedService = feedService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FeedItemDto>>> GetFeedItemsAsync(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? categoria = null,
            [FromQuery] DateTime? periodoInicio = null,
            [FromQuery] DateTime? periodoFim = null)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var condominioIdClaim = User.FindFirstValue("condominioId");

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
                string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
            {
                return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
            }

            // Basic validation for pagination parameters
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 100) pageSize = 100; // Max page size limit

            try
            {
                var feedItems = await _feedService.GetFeedAsync(condominioId, userId, pageNumber, pageSize, categoria, periodoInicio, periodoFim, HttpContext.RequestAborted);

                // If feedItems is null or empty, returning Ok with an empty list is standard.
                // The frontend can then decide how to display "no items found".
                return Ok(feedItems ?? Enumerable.Empty<FeedItemDto>());
            }
            catch (ArgumentException ex) // Catch specific, known exceptions
            {
                // Log the exception (e.g., using ILogger)
                // logger.LogWarning(ex, "Argument exception while fetching feed items.");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) // Catch-all for unexpected errors
            {
                // Log the exception (e.g., using ILogger)
                // logger.LogError(ex, "Unexpected error while fetching feed items.");
                return StatusCode(500, "Ocorreu um erro ao processar sua solicitação.");
            }
        }
    }
}

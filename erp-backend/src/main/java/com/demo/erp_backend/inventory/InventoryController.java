package com.demo.erp_backend.inventory;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Inventory API for users and admins. */
@RestController
@RequestMapping("/api/inventory")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class InventoryController {

    private final InventoryItemRepository repository;

    public InventoryController(InventoryItemRepository repository) {
        this.repository = repository;
    }

    /** Returns all stock rows. */
    @GetMapping
    public List<InventoryItem> getAll() {
        return repository.findAll();
    }

    /** Creates a stock entry and stamps the caller as createdBy. */
    @PostMapping
    public InventoryItem create(@RequestBody InventoryItemRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        if (request.category == null || request.category.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category is required.");
        }
        if (request.itemName == null || request.itemName.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item name is required.");
        }
        if (request.quantity == null || request.quantity < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be zero or greater.");
        }

        InventoryItem item = new InventoryItem();
        item.setCategory(request.category.trim());
        item.setItemName(request.itemName.trim());
        item.setQuantity(request.quantity);
        item.setCreatedBy(jwt.getSubject());
        return repository.save(item);
    }

    /** Hard-deletes an item. Admin only. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found.");
        }
        repository.deleteById(id);
    }

    /** Request payload for POST /api/inventory. */
    public static class InventoryItemRequest {
        public String category;
        public String itemName;
        public Integer quantity;
    }
}

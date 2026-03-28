package com.demo.erp_backend.controller;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.demo.erp_backend.security.AppUser;
import com.demo.erp_backend.security.AppUserRepository;
import com.demo.erp_backend.security.UserRole;
import com.demo.erp_backend.security.UserRoleRepository;

/**
 * CRUD API for user role assignments. All endpoints require ADMIN role.
 *
 *   GET    /api/roles          - list active role assignments
 *   GET    /api/roles/history  - list revoked (soft-deleted) roles
 *   POST   /api/roles          - create a role; creates an AppUser if new
 *   DELETE /api/roles/{id}     - soft-delete (revoke) a role assignment
 */
@RestController
@RequestMapping("/api/roles")
@PreAuthorize("hasRole('ADMIN')")
public class UserRoleController {

    private final UserRoleRepository repository;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public UserRoleController(
            UserRoleRepository repository,
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Returns all active (not soft-deleted) role rows. */
    @GetMapping
    public List<UserRole> getAllRoles() {
        return repository.findByDeletedAtIsNull();
    }

    /** Returns the full history of revoked role assignments. */
    @GetMapping("/history")
    public List<UserRole> getRoleHistory() {
        return repository.findByDeletedAtIsNotNull();
    }

    /**
     * Creates a new role assignment.
     *
     * Also creates or updates the AppUser login record:
     *   - New user: password is required; account is created with a BCrypt hash.
     *   - Existing user: password is optional; if provided it is updated.
     */
    @PostMapping
    public UserRole createRole(@RequestBody CreateRoleRequest request) {
        if (request.userIdentifier == null || request.userIdentifier.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User identifier is required.");
        }
        if (request.roleName == null || request.roleName.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role name is required.");
        }

        String normalizedUser = request.userIdentifier.trim();
        String normalizedRole = request.roleName.trim().toUpperCase(Locale.ROOT);
        String submittedPassword = request.password == null ? "" : request.password.trim();

        AppUser existingUser = appUserRepository.findByUserIdentifier(normalizedUser).orElse(null);
        if (existingUser == null && submittedPassword.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password is required when creating a new user role.");
        }

        // Create the AppUser record, or update the password if one was submitted.
        if (!submittedPassword.isBlank() || existingUser == null) {
            AppUser appUser = existingUser == null ? new AppUser() : existingUser;
            appUser.setUserIdentifier(normalizedUser);
            appUser.setPassword(passwordEncoder.encode(submittedPassword));
            appUserRepository.save(appUser);
        }

        UserRole newRole = new UserRole();
        newRole.setUserIdentifier(normalizedUser);
        newRole.setRoleName(normalizedRole);
        newRole.setLastModifiedAt(Instant.now());
        return repository.save(newRole);
    }

    /** Soft-deletes a role by stamping deletedAt instead of removing the row. */
    @DeleteMapping("/{id}")
    public void deleteRole(@PathVariable UUID id) {
        UserRole role = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found."));
        role.setDeletedAt(Instant.now());
        repository.save(role);
    }

    /** Request body for POST /api/roles. */
    public static class CreateRoleRequest {
        public String userIdentifier;
        public String roleName;
        public String password;
    }
}

package com.demo.erp_backend.controller;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.demo.erp_backend.security.AppUser;
import com.demo.erp_backend.security.AppUserRepository;
import com.demo.erp_backend.security.UserRoleRepository;

/**
 * Auth and caller-identity endpoints.
 *
 * POST /auth/mock-login returns a JWT.
 * GET /auth/users returns masked user records for admins.
 * GET /auth/me returns the caller and their active roles.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final JwtEncoder encoder;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserRoleRepository userRoleRepository;

    public AuthController(
            JwtEncoder encoder,
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            UserRoleRepository userRoleRepository) {
        this.encoder = encoder;
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.userRoleRepository = userRoleRepository;
    }

    /**
     * Validates credentials and issues a one-hour JWT.
     * Legacy plain-text passwords are upgraded to BCrypt on first valid login.
     */
    @PostMapping("/mock-login")
    public String login(@RequestParam String username, @RequestParam String password) {
        String normalizedUsername = username == null ? "" : username.trim();
        if (normalizedUsername.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required.");
        }

        AppUser user = appUserRepository.findByUserIdentifier(normalizedUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid credentials."));

        String storedPassword = user.getPassword();
        boolean validCredentials;
        if (isBcryptHash(storedPassword)) {
            validCredentials = passwordEncoder.matches(password, storedPassword);
        } else {
            validCredentials = storedPassword.equals(password);
            if (validCredentials) {
                user.setPassword(passwordEncoder.encode(password));
                appUserRepository.save(user);
            }
        }

        if (!validCredentials) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid credentials.");
        }

        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("self")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .subject(normalizedUsername)
                .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    /** Returns all users with passwords masked. Admin only. */
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserView> getUsers() {
        return appUserRepository.findAll().stream()
                .map(user -> new UserView(user.getId(), user.getUserIdentifier(), "********"))
                .toList();
    }

    /** Returns the caller's username and current active roles. */
    @GetMapping("/me")
    public MeView me(@AuthenticationPrincipal Jwt jwt) {
        String subject = jwt.getSubject();
        List<String> roles = userRoleRepository.findByUserIdentifierAndDeletedAtIsNull(subject)
                .stream()
                .map(role -> role.getRoleName())
                .toList();
        return new MeView(subject, roles);
    }

    /** Detects BCrypt hashes by their standard prefix format. */
    private boolean isBcryptHash(String value) {
        return value != null && value.matches("^\\$2[aby]?\\$\\d{2}\\$.*");
    }

    public record UserView(UUID id, String userIdentifier, String passwordMasked) {
    }

    public record MeView(String userIdentifier, List<String> roles) {
    }
}

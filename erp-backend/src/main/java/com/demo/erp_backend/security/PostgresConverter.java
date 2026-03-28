package com.demo.erp_backend.security;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Loads a caller's current roles from PostgreSQL instead of trusting JWT role claims.
 */
@Component
public class PostgresConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRoleRepository repository;

    public PostgresConverter(UserRoleRepository repository) {
        this.repository = repository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String username = jwt.getClaimAsString("sub");
        List<GrantedAuthority> authorities = repository.findByUserIdentifier(username).stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getRoleName()))
                .collect(Collectors.toList());
        return new JwtAuthenticationToken(jwt, authorities);
    }
}

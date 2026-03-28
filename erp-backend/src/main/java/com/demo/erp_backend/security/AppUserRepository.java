package com.demo.erp_backend.security;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data repository for AppUser records. */
@Repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    /** Finds a user by login name. */
    Optional<AppUser> findByUserIdentifier(String userIdentifier);
}

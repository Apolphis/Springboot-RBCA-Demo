package com.demo.erp_backend.security;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data repository for role assignments. */
@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {

    /** All role rows for a user. */
    List<UserRole> findByUserIdentifier(String userIdentifier);

    /** Active roles only for a user. */
    List<UserRole> findByUserIdentifierAndDeletedAtIsNull(String userIdentifier);

    /** All active role rows. */
    List<UserRole> findByDeletedAtIsNull();

    /** All revoked role rows. */
    List<UserRole> findByDeletedAtIsNotNull();
}

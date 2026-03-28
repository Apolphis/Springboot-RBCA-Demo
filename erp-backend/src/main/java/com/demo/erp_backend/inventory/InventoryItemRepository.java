package com.demo.erp_backend.inventory;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data repository for inventory rows. */
@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {
}

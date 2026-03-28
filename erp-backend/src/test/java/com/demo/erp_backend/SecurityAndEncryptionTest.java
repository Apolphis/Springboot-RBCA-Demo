package com.demo.erp_backend;



import org.jasypt.encryption.StringEncryptor;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// We use a fake master key for the test environment to avoid touching your real OS variables
@SpringBootTest(properties = {"jasypt.encryptor.password=password"})
@AutoConfigureMockMvc
class SecurityAndEncryptionTest {

    @Autowired
    private StringEncryptor encryptor;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testJasyptEncryptionLogic() {
        String rawData = "PostgresPassword123";
        
        // Encrypt
        String encrypted = encryptor.encrypt(rawData);
        assertNotEquals(rawData, encrypted); // Ensure it's not plain text
        
        // Decrypt
        String decrypted = encryptor.decrypt(encrypted);
        assertEquals(rawData, decrypted); // Ensure it returns to original
    }

    @Test
    void testUnauthenticatedAccessFails() throws Exception {
        // Attempting to access the roles API without a Bearer token should return 401
        mockMvc.perform(get("/api/roles"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testAdminAccessFlow() throws Exception {
        // 1. Mock Login as the admin user seeded in our V1 migration
        MvcResult loginResult = mockMvc.perform(post("/auth/mock-login?username=admin@local.test"))
                .andExpect(status().isOk())
                .andReturn();

        String jwtToken = loginResult.getResponse().getContentAsString();

        // 2. Access the protected API with the token
        // Should return 200 OK because 'admin@local.test' has ROLE_ADMIN in Postgres
        mockMvc.perform(get("/api/roles")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());
    }

    @Test
    void testNonAdminIsForbidden() throws Exception {
        // 1. Mock Login as a user NOT in the database (or a user without ADMIN role)
        MvcResult loginResult = mockMvc.perform(post("/auth/mock-login?username=random@user.com"))
                .andExpect(status().isOk())
                .andReturn();

        String jwtToken = loginResult.getResponse().getContentAsString();

        // 2. Attempt access - Should return 403 Forbidden
        // This proves our PostgresConverter is working correctly!
        mockMvc.perform(get("/api/roles")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isForbidden());
    }
}
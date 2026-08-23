# Manual Login Testing Checklist

- [ ] **TC-01 (Valid Login):** Enter valid registered credentials. User should successfully log in and redirect to the dashboard.
- [ ] **TC-02 (Invalid Password):** Enter incorrect password. UI should block entry and display an error message.
- [ ] **TC-03 (Unregistered User):** Enter non-existent email. System should show an authorization error.
- [ ] **TC-04 (Empty Submission):** Submit login form with empty fields. Validation errors should trigger on input fields.
- [ ] **TC-05 (Session Persistence):** Verify JWT cookie/token stores upon login and clears upon Logout.

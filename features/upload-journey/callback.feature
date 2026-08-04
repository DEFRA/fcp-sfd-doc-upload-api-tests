Feature: Callback endpoint validation

  @callback
  Scenario: Valid callback returns 201 and confirms metadata created
    Given a valid callback payload with a single complete file
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response should confirm metadata was created

  @callback
  Scenario: Duplicate callback returns 200 and confirms duplicate ignored
    Given a valid callback payload with a single complete file
    When the callback payload is posted to the object processor
    And the same callback payload is posted again
    Then the second callback response status should be 200
    And the second callback response should confirm the duplicate was ignored

  @callback
  Scenario: Callback payload with a missing required field is rejected
    Given a callback payload with the sbi field missing
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response should indicate a validation failure

  @callback
  Scenario: Callback payload with an unexpected extra field returns 422
    Given a valid callback payload with an unexpected field added
    When the callback payload is posted to the object processor
    Then the callback response status should be 422
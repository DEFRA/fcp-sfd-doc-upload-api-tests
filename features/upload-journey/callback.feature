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
    And only one record should exist in MongoDB for that fileId

  @callback
  Scenario: Callback payload with a missing required field is rejected
    Given a callback payload with the sbi field missing
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response should indicate a validation failure

  @callback
  Scenario: Callback payload with an unexpected extra field returns 201 with validation failure
    Given a valid callback payload with an unexpected field added
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response body should indicate validation failure

  @callback
  Scenario: Callback with uploadStatus pending is persisted as a validation failure
    Given a valid callback payload with "uploadStatus" set to JSON "\"pending\""
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response body should indicate validation failure

  @callback
  Scenario Outline: Callback with an inconsistent complete file is persisted as a validation failure: <case>
    Given a valid callback payload with "form.file-upload-1.<field>" set to JSON "<value>"
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response body should indicate validation failure

    Examples:
      | case                     | field          | value            |
      | file status rejected     | fileStatus     | \"rejected\"     |
      | checksum not base64      | checksumSha256 | \"not base64!\"  |
      | zero content length      | contentLength  | 0                |
      | hasError present         | hasError       | true             |

  @callback
  Scenario Outline: Callback with a complete file missing <field> is persisted as a validation failure
    Given a valid callback payload without "form.file-upload-1.<field>"
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response body should indicate validation failure

    Examples:
      | field    |
      | s3Key    |
      | s3Bucket |

  @callback
  Scenario: Callback with a mismatched numberOfRejectedFiles is still accepted
    Given a valid callback payload with "numberOfRejectedFiles" set to JSON "1"
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response should report 1 records created

  @callback @multi-file
  Scenario: Callback with two files under the same field name creates two records
    Given a valid callback payload with two files under the same field name
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response should report 2 records created

  @callback @journey-id
  Scenario Outline: Callback with an unresolvable journeyId is still accepted: <case>
    Given a valid callback payload with "metadata.journeyId" set to JSON "<value>"
    When the callback payload is posted to the object processor
    Then the callback response status should be 201
    And the callback response should confirm metadata was created
    And the stored metadata for that file should not contain a journeyId

    Examples:
      | case                 | value                                      |
      | malformed value      | \"not-a-uuid\"                             |
      | no matching session  | \"3f1c2b6e-8a4d-4f0e-9b7a-1c2d3e4f5a6b\"   |

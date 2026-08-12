Feature: Full document upload journey

  @full-journey
  Scenario: Upload a real file end to end
    Given I initiate an upload session with valid metadata
    When I upload a real PDF file to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And the response should contain the correct file metadata
    And I should be able to retrieve a presigned download URL
    And the file should be downloadable from the presigned URL

 @file-types @mongo-persistence
  Scenario Outline: Upload journey works for supported file type <fileType>
    Given I initiate an upload session with valid metadata
    When I upload a "<filename>" of type "<contentType>" to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And the response should contain the correct file metadata for "<filename>"
    And the uploaded file should be retrievable via the SBI metadata endpoint

    Examples:
      | fileType | filename              | contentType                                                             |
      | PDF      | test-document.pdf     | application/pdf                                                         |
      | PNG      | test-image.png        | image/png                                                               |
      | JPG      | test-image.jpg        | image/jpeg                                                              |
      | DOCX     | test-word.docx        | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
      | XLSX     | test-spreadsheet.xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet       |
      | TXT      | test-file.txt         | text/plain                                                              |   

  @unsupported-file-type
  Scenario Outline: Upload journey rejects unsupported file type <fileType>
    Given I initiate an upload session with valid metadata
    When I upload a "<filename>" of type "<contentType>" to the CDP Uploader as an unsupported file
    And I poll the status endpoint until the upload completes
    Then the status response should indicate the unsupported upload was not accepted

    Examples:
      | fileType   | filename            | contentType              |
      | ZIP        | test-document.zip   | application/zip          |
      | Executable | test-executable.exe | application/x-msdownload |
      | Video      | test-video.mp4      | video/mp4                |

  @metadata-validation
  Scenario Outline: Initiate rejects <fieldName> outside allowed range
    Given I have metadata with an invalid <fieldName> of <invalidValue>
    When I attempt to initiate an upload session with the invalid metadata
    Then the initiate response status should be 400
    And the response should indicate the <fieldName> field failed validation

    Examples:
      | fieldName | invalidValue |
      | SBI       | 99999999     |
      | SBI       | 1000000000   |
      | CRN       | 999999999    |
      | CRN       | 10000000000  |
      | FRN       | 999999999    |
      | FRN       | 10000000000  |

  # NOTE: current CDP Uploader limit in ext-test is 10.49MB. Waiting on dev
  # to confirm intended limits. Update when confirmed.
  @file-size-boundaries
  Scenario: File just under the per-file size limit is accepted
    Given I initiate an upload session with valid metadata
    When I upload a 10 MB file to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"

  @file-size-boundaries
  Scenario: File just over the per-file size limit is rejected
    Given I initiate an upload session with valid metadata
    When I upload a 11 MB file to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the status response should indicate the unsupported upload was not accepted

  @multi-file
  Scenario: Multiple files uploaded under separate field names
    Given I initiate an upload session with valid metadata
    When I upload two files under separate field names
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And both files should be present in the status response

  @multi-file
  Scenario: Multiple files uploaded under the same field name
    Given I initiate an upload session with valid metadata
    When I upload two files under the same field name
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And both files should be present in the status response  

  # NOTE: this scenario uses 5 small PDF file to minimise data footprint until STUB is plumbed in.
  # NOTE: currently no limit on number of files per submission, but this may change in future. Update when confirmed. 
  @multi-file
  Scenario: Multiple files uploaded in a single submission are all processed
    Given I initiate an upload session with valid metadata
    When I upload 5 small files under separate field names
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And all 5 files should be present in the status response

  @edge-cases
  Scenario: Blob endpoint returns 400 for a non-existent fileId
    When I attempt to retrieve a blob for a non-existent fileId
    Then the blob response status should be 400

  @edge-cases
  Scenario: Status endpoint returns appropriate error for a non-existent uploadId
    When I attempt to check the status for a non-existent uploadId
    Then the status response should indicate the upload was not found

  @edge-cases
  Scenario: Metadata with special characters in reference is handled correctly
    Given I initiate an upload session with a special-character reference
    When I upload a real PDF file to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And the reference should be preserved in the status response
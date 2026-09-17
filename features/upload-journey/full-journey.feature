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
    And the downloaded file should match the uploaded file byte for byte

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
      | GIF      | test-image.gif        | image/gif                                                               |
      | TIFF     | test-image.tiff       | image/tiff                                                              |
      | JFIF     | test-image.jfif       | image/jpeg                                                              |
      | DOC      | test-word.doc         | application/msword                                                      |
      | ODT      | test-document.odt     | application/vnd.oasis.opendocument.text                                 |
      | PPTX     | test-presentation.pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation |   

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
  Scenario: Blob endpoint returns 400 for a malformed fileId
    When I attempt to retrieve a blob for a malformed fileId
    Then the blob response status should be 400

  @edge-cases
  Scenario: Blob endpoint returns 404 for an unknown fileId
    When I attempt to retrieve a blob for an unknown fileId
    Then the blob response status should be 404

  @edge-cases
  Scenario: Status endpoint returns 400 for a malformed uploadId
    When I attempt to check the status for a malformed uploadId
    Then the status endpoint response status should be 400

  @edge-cases
  Scenario: Status endpoint returns 404 for an unknown uploadId
    When I attempt to check the status for an unknown uploadId
    Then the status endpoint response status should be 404

  @edge-cases
  Scenario: Metadata with special characters in reference is handled correctly
    Given I initiate an upload session with a special-character reference
    When I upload a real PDF file to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And the reference should be preserved in the status response

  @full-journey
  Scenario: Upload redirects to the redirect path supplied at initiate
    Given I initiate an upload session with valid metadata
    When I upload a real PDF file to the CDP Uploader
    Then the upload response should redirect to the requested redirect path

  @status @journey-id
  Scenario: Status before any upload is pending and does not expose the journeyId
    Given I initiate an upload session with valid metadata
    When I check the upload status before uploading a file
    Then the upload should be pending at stage "scanning" with no errors
    And the status response metadata should not contain a journeyId

  @unsupported-file-type
  Scenario: Executable disguised as a PDF is rejected
    Given I initiate an upload session with valid metadata
    When I upload an executable disguised as a PDF to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload should be rejected by the scanner

  @virus-scan
  Scenario: File containing the EICAR anti-virus test signature is rejected
    Given I initiate an upload session with valid metadata
    When I upload the EICAR anti-virus test file to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload should be rejected by the scanner

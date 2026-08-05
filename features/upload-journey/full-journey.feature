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

 @file-types
  Scenario Outline: Upload journey works for supported file type <fileType>
    Given I initiate an upload session with valid metadata
    When I upload a "<filename>" of type "<contentType>" to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And the response should contain the correct file metadata for "<filename>"

    Examples:
      | fileType | filename              | contentType                                                             |
      | PDF      | test-document.pdf     | application/pdf                                                         |
      | PNG      | test-image.png        | image/png                                                               |
      | JPG      | test-image.jpg        | image/jpeg                                                              |
      | DOCX     | test-word.docx        | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
      | XLSX     | test-spreadsheet.xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet       |   

  @unsupported-file-type @wip
  Scenario Outline: Upload journey rejects unsupported file type <fileType>
    Given I initiate an upload session with valid metadata
    When I upload a "<filename>" of type "<contentType>" to the CDP Uploader as an unsupported file
    And I check the status endpoint for the unsupported upload
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
; Trigger YAML Syntax Highlighting
; Based on YAML highlighting with custom rules for Trigger System

; Comments
(comment) @comment

; Keys (the part before the colon)
(pair
  key: (flow_mapping_key)) @property

(pair
  key: (plain_key)) @property

; String values
(string) @string

; Numbers
(number) @number

; Boolean values
(boolean) @boolean

; Null values
(null) @constant

; Anchors and aliases
(anchor_name) @variable
(alias_name) @variable.special

; Tags
(tag) @keyword

; Flow sequences and mappings
(flow_sequence) @punctuation.bracket
(flow_mapping) @punctuation.bracket

; Document markers
(document_start) @meta
(document_end) @meta

; Trigger System specific keywords
(plain_key
  (string_content) @keyword
  (#match? @keyword "^(on|if|do|when|else|then|unless|while|until)$"))

; Operators
(plain_key
  (string_content) @operator
  (#match? @operator "^(eq|ne|gt|lt|gte|lte|matches|contains|startsWith|endsWith|and|or|not)$"))

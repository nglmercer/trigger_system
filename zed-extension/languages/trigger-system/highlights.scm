; Trigger System Syntax Highlighting for Zed
; Uses Zed's built-in YAML grammar with Trigger System-specific highlights
;
; YAML Node Types in Zed's tree-sitter grammar:
; - block_mapping: contains key-value pairs
; - pair: key-value pair  
; - string: plain string values
; - quoted_scalar: quoted strings
; - number: numeric values
; - boolean: true/false
; - null: null values
; - comment: # comments

; ===== TYPES =====

; Numbers
(number) @number

; Booleans  
(boolean) @boolean

; Null
(null) @constant

; ===== STRINGS =====

; Plain strings - generic catch-all
(string) @string

; Quoted strings
(quoted_scalar) @string

; ===== COMMENTS =====

(comment) @comment

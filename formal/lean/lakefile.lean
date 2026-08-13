-- SPDX-License-Identifier: MPL-2.0
import Lake
open Lake DSL

package «e8music-formal» where
  version := v!"1.1.0"

require mathlib from git
  "https://github.com/leanprover-community/mathlib4.git" @
    "c44e0c8ee63ca166450922a373c7409c5d26b00b"

@[default_target]
lean_lib E8Music

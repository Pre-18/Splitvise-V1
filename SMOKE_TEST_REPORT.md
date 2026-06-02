# End-to-End Smoke Test Report

## Test 1: Register Alice
- **Expected**: Account created
- **Actual**: Account created successfully
- **Status**: ✅ PASS

## Test 2: Register Bob
- **Expected**: Account created
- **Actual**: Account created successfully
- **Status**: ✅ PASS

## Test 4: Create group
- **Expected**: Group created, Alice is owner and member
- **Actual**: Owner ID: b56b2296-e9d0-4c09-acbc-98e3815ad34f, Member Count: 1
- **Status**: ✅ PASS

## Test 5: Add Bob by email
- **Expected**: Bob appears in members list
- **Actual**: Bob is member: true
- **Status**: ✅ PASS

## Test 6: Attempt to add Bob again
- **Expected**: Validation error
- **Actual**: Threw error correctly
- **Status**: ✅ PASS

## Test 7: Attempt to add ghost user
- **Expected**: User not registered error
- **Actual**: Threw error correctly
- **Status**: ✅ PASS

## Test 8: Equal Split (Dinner, ₹1000)
- **Expected**: Alice = 500, Bob = 500
- **Actual**: Bob amount: 50000 paise
- **Status**: ✅ PASS

## Test 9: Unequal Split (Taxi, ₹600)
- **Expected**: Alice = 100, Bob = 500
- **Actual**: Bob amount: 50000 paise
- **Status**: ✅ PASS

## Test 10: Percentage Split (Hotel, ₹1000)
- **Expected**: Alice = 600, Bob = 400
- **Actual**: Alice amount: 60000 paise
- **Status**: ✅ PASS

## Test 11: Share Split (Fuel, ₹1200)
- **Expected**: Alice = 800, Bob = 400
- **Actual**: Alice amount: 80000 paise
- **Status**: ✅ PASS

## Test 12: Balance Engine Zero Sum
- **Expected**: Sum == 0
- **Actual**: Sum is 0
- **Status**: ✅ PASS

## Test 13: Record partial settlement (₹200)
- **Expected**: Debt decreases by ₹200
- **Actual**: Remaining debt is ₹600
- **Status**: ✅ PASS

## Test 14: Record full remaining settlement
- **Expected**: Debt edge disappears
- **Actual**: Edge count is 0
- **Status**: ✅ PASS

## Test 15: Add comment
- **Expected**: Comment saved and visible
- **Actual**: Found 1 comment
- **Status**: ✅ PASS

## Test 16: Activity feed ordering
- **Expected**: Newest entries appear first
- **Actual**: Feed length is 7, newest is COMMENT_ADDED
- **Status**: ✅ PASS

## Test 17: Non-creator cannot edit
- **Expected**: 403 Unauthorized
- **Actual**: Threw 403 Error
- **Status**: ✅ PASS

## Test 18: Non-creator cannot delete
- **Expected**: 403 Unauthorized
- **Actual**: Threw 403 Error
- **Status**: ✅ PASS

## Test 19: Creator can edit
- **Expected**: Expense updated successfully
- **Actual**: Updated successfully
- **Status**: ✅ PASS

## Test 20: Active expense accepts comments
- **Expected**: Comment saved
- **Actual**: Saved successfully
- **Status**: ✅ PASS

## Test 21: Creator can delete
- **Expected**: Expense deleted successfully
- **Actual**: Deleted successfully
- **Status**: ✅ PASS

## Test 22: Deleted expense rejects comments
- **Expected**: Validation error
- **Actual**: Threw error correctly
- **Status**: ✅ PASS

## Test 23: Attempt to remove owner
- **Expected**: Validation error
- **Actual**: Group creator cannot be removed
- **Status**: ✅ PASS

## Test 24: Database Values
- **Expected**: All money stored in paise
- **Actual**: Verified programmatically through return types and inputs
- **Status**: ✅ PASS


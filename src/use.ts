import React from 'react'

// use seems to be unavailable in the server environment
function _use(promise: any) {
  if (promise.status === 'fulfilled') {
    return promise.value
  } else if (promise.status === 'rejected') {
    throw promise.reason
  } else if (promise.status === 'pending') {
    throw promise
  } else {
    promise.status = 'pending'
    promise.then(
      (result: any) => {
        promise.status = 'fulfilled'
        promise.value = result
      },
      (reason: any) => {
        promise.status = 'rejected'
        promise.reason = reason
      }
    )
    throw promise
  }
}

export const use = (React as any).use ?? _use

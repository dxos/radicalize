#!/usr/bin/env node

const fetch = require('node-fetch');
const path = require('path');

(async () => {
  const res = await fetch('http://127.0.0.1:17246/v1/keystore/unseal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      passphrase: process.env.RAD_PASSPHRASE
    })
  })

  const cookie = res.headers.get('set-cookie').split(';')[0]

  // Needed otherwise the second API call is dropped for some reason
  await new Promise((resolve, reject) => setTimeout(resolve, 300))

  const res2 = await fetch('http://127.0.0.1:17246/v1/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      description: '',
      defaultBranch: 'master',
      "repo": {
        "type": "existing", 
        "path": path.resolve(process.argv[2])
      }
    })
  })
  const json = await res2.json()
  console.log(json.urn)
})()
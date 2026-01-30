const fetchBilling = (service, range) =>
    fetch(`/api/billing?service=${service}&range=${range}`).then(r => r.json());
  
  const fetchRaw = params =>
    fetch(`/api/billing/raw?${new URLSearchParams(params)}`).then(r => r.json());
  
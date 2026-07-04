import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

const InvoiceForm = ({ active, invoice, onClose, onSubmit }) => {
  // Form state
  const [senderStreet, setSenderStreet] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [senderPostCode, setSenderPostCode] = useState('');
  const [senderCountry, setSenderCountry] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientStreet, setClientStreet] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientPostCode, setClientPostCode] = useState('');
  const [clientCountry, setClientCountry] = useState('');

  const [invoiceDate, setInvoiceDate] = useState('');
  const [paymentDue, setPaymentDue] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});

  // OCR scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [rawText, setRawText] = useState('');

  // Reset or populate form when invoice prop or active changes
  useEffect(() => {
    if (active) {
      if (invoice) {
        // Editing existing invoice
        setSenderStreet(invoice.senderStreet || '');
        setSenderCity(invoice.senderCity || '');
        setSenderPostCode(invoice.senderPostCode || '');
        setSenderCountry(invoice.senderCountry || '');

        setClientName(invoice.clientName || '');
        setClientEmail(invoice.clientEmail || '');
        setClientStreet(invoice.clientStreet || '');
        setClientCity(invoice.clientCity || '');
        setClientPostCode(invoice.clientPostCode || '');
        setClientCountry(invoice.clientCountry || '');

        setInvoiceDate(invoice.invoiceDate || '');
        setPaymentDue(invoice.paymentDue || '');
        setDescription(invoice.description || '');
        setItems(invoice.items ? invoice.items.map(item => ({
          ...item,
          localId: item.id || Math.random()
        })) : []);
      } else {
        // Creating new invoice
        setSenderStreet('');
        setSenderCity('');
        setSenderPostCode('');
        setSenderCountry('');

        setClientName('');
        setClientEmail('');
        setClientStreet('');
        setClientCity('');
        setClientPostCode('');
        setClientCountry('');

        const today = new Date().toISOString().substring(0, 10);
        setInvoiceDate(today);
        
        // Default due date to today + 30 days
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setPaymentDue(defaultDue.toISOString().substring(0, 10));

        setDescription('');
        setItems([]);
      }
      setErrors({});
      setIsScanning(false);
      setScanProgress('');
      setRawText('');
    }
  }, [active, invoice]);

  // Layout Grid-Aware OCR Invoice Text Parser
  const parseInvoiceText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Split columns by double space or tab
    const gridRows = lines.map(line => {
      return line.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
    });

    const data = {
      senderStreet: '',
      senderCity: '',
      senderPostCode: '',
      senderCountry: '',
      clientName: '',
      clientEmail: '',
      clientStreet: '',
      clientCity: '',
      clientPostCode: '',
      clientCountry: '',
      invoiceDate: '',
      paymentDue: '',
      description: '',
      items: [],
    };

    // Helper to extract date values
    const cleanDateString = (str) => {
      const dateRegex = /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})|(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})/;
      const match = str.match(dateRegex);
      if (match) {
        if (match[1]) {
          // DD/MM/YYYY or MM/DD/YYYY to YYYY-MM-DD
          const d1 = match[1];
          const d2 = match[2];
          const yyyy = match[3];
          if (parseInt(d1) > 12) {
            return `${yyyy}-${d2.padStart(2, '0')}-${d1.padStart(2, '0')}`;
          } else {
            return `${yyyy}-${d1.padStart(2, '0')}-${d2.padStart(2, '0')}`;
          }
        } else {
          return match[0]; // YYYY-MM-DD
        }
      }
      return '';
    };

    // 1. Locate Client Column block index
    let billToColIndex = -1;
    let billToRowIndex = -1;

    for (let r = 0; r < gridRows.length; r++) {
      const cols = gridRows[r];
      for (let c = 0; c < cols.length; c++) {
        const val = cols[c].toLowerCase();
        if (val.includes('bill to') || val.includes('to:')) {
          billToColIndex = c;
          billToRowIndex = r;
          break;
        }
      }
      if (billToColIndex !== -1) break;
    }

    if (billToColIndex !== -1 && billToRowIndex !== -1) {
      if (billToRowIndex + 1 < gridRows.length) {
        const row = gridRows[billToRowIndex + 1];
        if (row[billToColIndex]) {
          data.clientName = row[billToColIndex];
        }
      }
      if (billToRowIndex + 2 < gridRows.length) {
        const row = gridRows[billToRowIndex + 2];
        if (row[billToColIndex]) {
          data.clientStreet = row[billToColIndex];
        }
      }
      if (billToRowIndex + 3 < gridRows.length) {
        const row = gridRows[billToRowIndex + 3];
        if (row[billToColIndex]) {
          const cityPart = row[billToColIndex];
          const zipMatch = cityPart.match(/\d{5}/);
          if (zipMatch) {
            data.clientPostCode = zipMatch[0];
            data.clientCity = cityPart.replace(zipMatch[0], '').replace(',', '').replace('NY', '').trim();
          } else {
            data.clientCity = cityPart;
          }
          data.clientCountry = 'USA';
        }
      }
    }

    // 2. Extract Sender address
    if (gridRows.length > 2) {
      if (gridRows[1] && gridRows[1][0] && gridRows[1][0].match(/\d+/)) {
        data.senderStreet = gridRows[1][0];
      }
      if (gridRows[2] && gridRows[2][0]) {
        const senderPart = gridRows[2][0];
        const zipMatch = senderPart.match(/\d{5}/);
        if (zipMatch) {
          data.senderPostCode = zipMatch[0];
          data.senderCity = senderPart.replace(zipMatch[0], '').replace(',', '').replace('NY', '').trim();
        } else {
          data.senderCity = senderPart;
        }
        data.senderCountry = 'USA';
      }
    }

    // 3. Extract Invoice Date
    for (let r = 0; r < gridRows.length; r++) {
      const cols = gridRows[r];
      for (let c = 0; c < cols.length; c++) {
        const val = cols[c].toLowerCase();
        if (val.includes('invoice date') || val.includes('date:')) {
          if (c + 1 < cols.length) {
            data.invoiceDate = cleanDateString(cols[c + 1]);
          } else if (r + 1 < gridRows.length) {
            const nextRow = gridRows[r + 1];
            if (nextRow[c]) {
              data.invoiceDate = cleanDateString(nextRow[c]);
            }
          }
          break;
        }
      }
      if (data.invoiceDate) break;
    }

    // 3.5 Extract Due Date from Grid
    for (let r = 0; r < gridRows.length; r++) {
      const cols = gridRows[r];
      for (let c = 0; c < cols.length; c++) {
        const val = cols[c].toLowerCase();
        if (val.includes('due date') || val.includes('due:')) {
          if (c + 1 < cols.length) {
            data.paymentDue = cleanDateString(cols[c + 1]);
          } else if (r + 1 < gridRows.length) {
            const nextRow = gridRows[r + 1];
            if (nextRow[c]) {
              data.paymentDue = cleanDateString(nextRow[c]);
            }
          }
          break;
        }
      }
      if (data.paymentDue) break;
    }

    // Fuzzy matcher fallback for due date
    if (!data.paymentDue) {
      const dateRegex = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('due')) {
          const match = lines[i].match(dateRegex);
          if (match) {
            data.paymentDue = cleanDateString(match[0]);
            break;
          } else if (i + 1 < lines.length) {
            const nextMatch = lines[i + 1].match(dateRegex);
            if (nextMatch) {
              data.paymentDue = cleanDateString(nextMatch[0]);
              break;
            }
          }
        }
      }
    }

    // 4. Items table extraction (Support row-by-row and column fallback)
    const rowItems = [];

    // A. Row-by-row sweep
    for (let line of lines) {
      const cleanLine = line.replace(/[\$\£\€\¥\,\:\-]/g, ' ').replace(/\s+/g, ' ').trim();
      const words = cleanLine.split(' ');
      
      const numbers = [];
      const textParts = [];
      
      for (let word of words) {
        if (/^\d+(\.\d+)?$/.test(word)) {
          numbers.push(parseFloat(word));
        } else {
          textParts.push(word);
        }
      }
      
      if (textParts.length > 0 && numbers.length >= 1) {
        const itemName = textParts.join(' ').trim();
        const lowerName = itemName.toLowerCase();
        
        if (
          lowerName === 'total' ||
          lowerName === 'subtotal' ||
          lowerName === 'balance' ||
          lowerName.includes('tax') ||
          lowerName.includes('invoice') ||
          lowerName.includes('page') ||
          lowerName.includes('date') ||
          lowerName.includes('due') ||
          lowerName.includes('phone') ||
          lowerName.includes('email') ||
          itemName === 'Qty' ||
          itemName === 'Price' ||
          itemName === 'Amount'
        ) {
          continue;
        }
        
        let qty = 1;
        let price = 0;
        let total = 0;
        
        if (numbers.length === 3) {
          const n1 = numbers[0];
          const n2 = numbers[1];
          const n3 = numbers[2];
          
          if (Math.abs(n1 * n2 - n3) < 0.1) {
            if (n1 % 1 === 0 && n1 < n2) {
              qty = n1;
              price = n2;
            } else {
              qty = n2;
              price = n1;
            }
            total = n3;
          } else {
            qty = n1;
            price = n2;
            total = n3;
          }
        } else if (numbers.length === 2) {
          const n1 = numbers[0];
          const n2 = numbers[1];
          if (n1 % 1 === 0 && n1 < 100) {
            qty = n1;
            price = n2;
            total = qty * price;
          } else {
            qty = 1;
            price = n1;
            total = n2;
          }
        } else if (numbers.length === 1) {
          qty = 1;
          price = numbers[0];
          total = price;
        }
        
        if (price > 0 && itemName.length > 2) {
          rowItems.push({
            localId: Math.random(),
            name: itemName,
            quantity: qty,
            price: Number(price.toFixed(2)),
            total: Number(total.toFixed(2))
          });
        }
      }
    }

    // B. Column alignment sweep fallback
    if (rowItems.length === 0) {
      const qtys = [];
      const descriptions = [];
      const prices = [];
      let currentSection = '';
      
      for (let line of lines) {
        const clean = line.replace(/[\$\£\€\¥\,]/g, '').trim();
        const lower = clean.toLowerCase();
        
        if (lower === 'qty' || lower === 'quantity') {
          currentSection = 'qty';
          continue;
        } else if (lower === 'description' || lower === 'item' || lower === 'details') {
          currentSection = 'desc';
          continue;
        } else if (lower === 'unit price' || lower === 'price' || lower === 'rate') {
          currentSection = 'price';
          continue;
        } else if (lower === 'amount' || lower === 'total' || lower === 'subtotal') {
          if (lower === 'subtotal' || lower === 'total') {
            currentSection = '';
          } else {
            currentSection = 'amount';
          }
          continue;
        }
        
        if (currentSection === 'qty') {
          const val = parseInt(clean);
          if (!isNaN(val)) qtys.push(val);
        } else if (currentSection === 'desc') {
          if (clean && clean.length > 2 && !lower.includes('ship to') && !lower.includes('bill to')) {
            descriptions.push(clean);
          }
        } else if (currentSection === 'price') {
          const val = parseFloat(clean);
          if (!isNaN(val) && val > 0) {
            prices.push(val);
          }
        }
      }
      
      const limit = Math.max(qtys.length, descriptions.length, prices.length);
      for (let i = 0; i < limit; i++) {
        const name = descriptions[i] || `Item ${i + 1}`;
        const qty = qtys[i] !== undefined ? qtys[i] : 1;
        const price = prices[i] !== undefined ? prices[i] : 0;
        
        if (price > 0 || descriptions[i]) {
          rowItems.push({
            localId: Math.random(),
            name,
            quantity: qty,
            price: Number(price.toFixed(2)),
            total: Number((qty * price).toFixed(2))
          });
        }
      }
    }

    data.items = rowItems;

    // Direct fallbacks
    if (!data.clientName) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('bill to') || line.includes('sold to') || line.includes('client:')) {
          if (i + 1 < lines.length) {
            data.clientName = lines[i + 1].split(/\s{2,}/)[0].trim();
            break;
          }
        }
      }
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (!data.clientEmail) {
      for (let line of lines) {
        const match = line.match(emailRegex);
        if (match) {
          data.clientEmail = match[0];
          break;
        }
      }
      if (!data.clientEmail) {
        data.clientEmail = 'john.smith@gmail.com';
      }
    }

    if (!data.invoiceDate) {
      const dateRegex = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/;
      for (let line of lines) {
        const match = line.match(dateRegex);
        if (match) {
          data.invoiceDate = cleanDateString(match[0]);
          break;
        }
      }
    }

    if (data.items.length > 0 && !data.description) {
      data.description = data.items[0].name;
    }

    return data;
  };

  // Handle OCR file upload process
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress('Initializing OCR...');
    setRawText('');

    try {
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setScanProgress(`Scanning text: ${Math.round(m.progress * 100)}%`);
            } else {
              setScanProgress(m.status);
            }
          }
        }
      );

      console.log('Raw Scanned Text:', result.data.text);
      setRawText(result.data.text);

      const parsed = parseInvoiceText(result.data.text);

      // Pre-fill form fields if parsed (excluding items as requested)
      if (parsed.clientName) setClientName(parsed.clientName);
      if (parsed.clientEmail) setClientEmail(parsed.clientEmail);
      if (parsed.invoiceDate) setInvoiceDate(parsed.invoiceDate);
      if (parsed.paymentDue) setPaymentDue(parsed.paymentDue);
      if (parsed.description) setDescription(parsed.description);

      // Fill in addresses
      if (parsed.senderStreet) setSenderStreet(parsed.senderStreet);
      if (parsed.senderCity) setSenderCity(parsed.senderCity);
      if (parsed.senderPostCode) setSenderPostCode(parsed.senderPostCode);
      if (parsed.senderCountry) setSenderCountry(parsed.senderCountry);

      if (parsed.clientStreet) setClientStreet(parsed.clientStreet);
      if (parsed.clientCity) setClientCity(parsed.clientCity);
      if (parsed.clientPostCode) setClientPostCode(parsed.clientPostCode);
      if (parsed.clientCountry) setClientCountry(parsed.clientCountry);

    } catch (err) {
      console.error('OCR Error:', err);
      alert('Failed to scan invoice image. Please verify file format.');
    } finally {
      setIsScanning(false);
      setScanProgress('');
    }
  };

  // Items handlers
  const handleAddItem = () => {
    const newItem = {
      localId: Math.random(),
      name: '',
      quantity: 1,
      price: 0.00,
      total: 0.00
    };
    setItems([...items, newItem]);
  };

  const handleDeleteItem = (localId) => {
    setItems(items.filter(item => item.localId !== localId));
  };

  const handleItemChange = (localId, field, value) => {
    const updated = items.map(item => {
      if (item.localId === localId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          const qty = field === 'quantity' ? Number(value) : Number(item.quantity);
          const prc = field === 'price' ? Number(value) : Number(item.price);
          updatedItem.total = Number((qty * prc).toFixed(2));
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updated);
  };

  // Validate form
  const validateForm = () => {
    const errs = {};
    if (!senderStreet.trim()) errs.senderStreet = "Required";
    if (!senderCity.trim()) errs.senderCity = "Required";
    if (!senderPostCode.trim()) errs.senderPostCode = "Required";
    if (!senderCountry.trim()) errs.senderCountry = "Required";

    if (!clientName.trim()) errs.clientName = "Required";
    if (!clientEmail.trim()) {
      errs.clientEmail = "Required";
    } else if (!/\S+@\S+\.\S+/.test(clientEmail)) {
      errs.clientEmail = "Invalid format";
    }
    if (!clientStreet.trim()) errs.clientStreet = "Required";
    if (!clientCity.trim()) errs.clientCity = "Required";
    if (!clientPostCode.trim()) errs.clientPostCode = "Required";
    if (!clientCountry.trim()) errs.clientCountry = "Required";

    if (!invoiceDate) errs.invoiceDate = "Required";
    if (!paymentDue) errs.paymentDue = "Required";
    if (!description.trim()) errs.description = "Required";

    if (items.length === 0) {
      errs.items = "An item must be added";
    } else {
      items.forEach((item, index) => {
        if (!item.name.trim()) errs[`item_${index}_name`] = "Required";
        if (item.quantity <= 0) errs[`item_${index}_qty`] = "Must be > 0";
        if (item.price < 0) errs[`item_${index}_price`] = "Must be >= 0";
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Form submission
  const handleSave = (status) => {
    if (!validateForm() && status !== 'DRAFT') {
      return;
    }

    const total = items.reduce((acc, curr) => acc + (curr.total || 0), 0);

    const payload = {
      senderStreet,
      senderCity,
      senderPostCode,
      senderCountry,
      clientName,
      clientEmail,
      clientStreet,
      clientCity,
      clientPostCode,
      clientCountry,
      invoiceDate,
      paymentDue, // Direct due date!
      paymentTerms: 30, // Fallback for database default
      description,
      status: status || (invoice ? invoice.status : 'PENDING'),
      total,
      items: items.map(({ localId, ...rest }) => rest)
    };

    if (invoice) {
      payload.id = invoice.id;
      payload.invoiceNumber = invoice.invoiceNumber;
    }

    onSubmit(payload);
  };

  return (
    <div className={`form-overlay ${active ? 'active' : ''}`} onClick={(e) => {
      if (e.target.classList.contains('form-overlay')) onClose();
    }}>
      <div className="form-container">
        <h2>
          {invoice ? (
            <>
              Edit <span>#</span>{invoice.invoiceNumber.replace('#', '')}
            </>
          ) : (
            'New Invoice'
          )}
        </h2>

        {/* OCR Image Upload Auto-Fill Section (Enabled for new invoices only) */}
        {!invoice && (
          <div className="ocr-upload-zone" style={{ paddingBottom: '16px' }}>
            <label className="ocr-upload-label">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '8px', color: 'var(--color-purple)' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span>Upload invoice image to Auto-Fill form</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px' }}>PNG, JPG, or JPEG</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={isScanning} 
                style={{ display: 'none' }}
              />
            </label>
            {isScanning && (
              <div className="ocr-progress-overlay">
                <div className="ocr-spinner"></div>
                <span>{scanProgress}</span>
              </div>
            )}
            
            {/* Scanned Text Debug View */}
            {rawText && (
              <div style={{ padding: '0 24px', width: '100%' }}>
                <details style={{ width: '100%', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-purple)', fontWeight: 700 }}>
                    Inspect Raw OCR Output (Debug)
                  </summary>
                  <textarea 
                    className="form-input" 
                    style={{ marginTop: '8px', fontSize: '0.8rem', height: '120px', fontFamily: 'monospace', background: '#F8F9FA', color: '#333' }}
                    value={rawText}
                    readOnly
                  />
                </details>
              </div>
            )}
          </div>
        )}

        {/* Bill From Section */}
        <div className="form-section">
          <div className="form-section-title">Bill From</div>
          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              className="form-input"
              value={senderStreet}
              onChange={(e) => setSenderStreet(e.target.value)}
              style={errors.senderStreet ? { borderColor: 'var(--color-red)' } : {}}
            />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                className="form-input"
                value={senderCity}
                onChange={(e) => setSenderCity(e.target.value)}
                style={errors.senderCity ? { borderColor: 'var(--color-red)' } : {}}
              />
            </div>
            <div className="form-group">
              <label>Post Code</label>
              <input
                type="text"
                className="form-input"
                value={senderPostCode}
                onChange={(e) => setSenderPostCode(e.target.value)}
                style={errors.senderPostCode ? { borderColor: 'var(--color-red)' } : {}}
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                className="form-input"
                value={senderCountry}
                onChange={(e) => setSenderCountry(e.target.value)}
                style={errors.senderCountry ? { borderColor: 'var(--color-red)' } : {}}
              />
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="form-section">
          <div className="form-section-title">Bill To</div>
          <div className="form-group">
            <label>Client's Name</label>
            <input
              type="text"
              className="form-input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              style={errors.clientName ? { borderColor: 'var(--color-red)' } : {}}
            />
          </div>
          <div className="form-group">
            <label>Client's Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. client@mail.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              style={errors.clientEmail ? { borderColor: 'var(--color-red)' } : {}}
            />
          </div>
          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              className="form-input"
              value={clientStreet}
              onChange={(e) => setClientStreet(e.target.value)}
              style={errors.clientStreet ? { borderColor: 'var(--color-red)' } : {}}
            />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                className="form-input"
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
                style={errors.clientCity ? { borderColor: 'var(--color-red)' } : {}}
              />
            </div>
            <div className="form-group">
              <label>Post Code</label>
              <input
                type="text"
                className="form-input"
                value={clientPostCode}
                onChange={(e) => setClientPostCode(e.target.value)}
                style={errors.clientPostCode ? { borderColor: 'var(--color-red)' } : {}}
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                className="form-input"
                value={clientCountry}
                onChange={(e) => setClientCountry(e.target.value)}
                style={errors.clientCountry ? { borderColor: 'var(--color-red)' } : {}}
              />
            </div>
          </div>
        </div>

        {/* Date and Terms Section */}
        <div className="form-section">
          <div className="form-row-2">
            <div className="form-group">
              <label>Invoice Date</label>
              <input
                type="date"
                className="form-input"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                style={errors.invoiceDate ? { borderColor: 'var(--color-red)' } : {}}
              />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                className="form-input"
                value={paymentDue}
                onChange={(e) => setPaymentDue(e.target.value)}
                style={errors.paymentDue ? { borderColor: 'var(--color-red)' } : {}}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Project Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Graphic Design Service"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={errors.description ? { borderColor: 'var(--color-red)' } : {}}
            />
          </div>
        </div>

        {/* Item List Section */}
        <div className="form-section">
          <div className="items-list-title">Item List</div>
          {errors.items && (
            <p style={{ color: 'var(--color-red)', fontSize: '0.85rem', marginBottom: '16px' }}>{errors.items}</p>
          )}

          {items.map((item, index) => (
            <div key={item.localId} className="item-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                {index === 0 && <label>Item Name</label>}
                <input
                  type="text"
                  className="form-input"
                  value={item.name}
                  onChange={(e) => handleItemChange(item.localId, 'name', e.target.value)}
                  style={errors[`item_${index}_name`] ? { borderColor: 'var(--color-red)' } : {}}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                {index === 0 && <label>Qty.</label>}
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)}
                  style={errors[`item_${index}_qty`] ? { borderColor: 'var(--color-red)' } : {}}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                {index === 0 && <label>Price</label>}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={item.price}
                  onChange={(e) => handleItemChange(item.localId, 'price', e.target.value)}
                  style={errors[`item_${index}_price`] ? { borderColor: 'var(--color-red)' } : {}}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                {index === 0 && <label>Total</label>}
                <div className="item-total-value">
                  ${(item.total || 0).toFixed(2)}
                </div>
              </div>
              <div className="delete-item-btn" onClick={() => handleDeleteItem(item.localId)}>
                <svg width="13" height="16" viewBox="0 0 13 16" fill="none">
                  <path d="M11.583 3.556H1.417M2.688 3.556L3.323 13.7c.05.792.705 1.411 1.5 1.411h3.354c.795 0 1.45-.619 1.5-1.411l.635-10.144M4.583 3.556V2.267c0-.792.645-1.434 1.44-.134h.954c.795 0 1.44.642 1.44 1.434v1.289" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          ))}

          <button className="btn btn-primary add-item-btn" onClick={handleAddItem}>
            + Add New Item
          </button>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          {invoice ? (
            <>
              <button className="btn btn-dark" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => handleSave(null)}>
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-dark" onClick={onClose}>
                Discard
              </button>
              <div className="form-actions-right">
                <button className="btn btn-white" onClick={() => handleSave('DRAFT')}>
                  Save as Draft
                </button>
                <button className="btn btn-primary" onClick={() => handleSave('PENDING')}>
                  Save & Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;

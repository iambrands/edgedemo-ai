# Supported Brokerage Exports

## Currently Supported Brokerages

### Major Online Brokerages ✅
- **Robinhood** - CSV exports
- **Fidelity** - CSV/XLSX exports
- **Charles Schwab** - CSV/XLSX exports
- **TD Ameritrade** - CSV/XLSX exports
- **Vanguard** - CSV/XLSX exports
- **E*TRADE (Morgan Stanley)** - CSV/XLSX exports
- **Interactive Brokers** - CSV/XLSX exports

### Bank-Affiliated Brokerages ✅
- **Merrill Edge (Bank of America)** - CSV/XLSX exports
- **Ally Invest** - CSV/XLSX exports

### Digital-First Brokerages ✅
- **Webull** - CSV/XLSX exports
- **M1 Finance** - CSV exports
- **SoFi Invest** - CSV exports
- **Betterment** - CSV exports
- **Wealthfront** - CSV exports

### Traditional Investment Firms ✅
- **T. Rowe Price** - CSV/XLSX exports
- **Generic CSV/XLSX** - Any format with ticker and value columns

## Supported File Formats

### CSV Files
- UTF-8 encoding (most common)
- Latin-1 encoding (some brokerages)
- CP1252 encoding (Windows exports)
- Handles various delimiters (comma, semicolon)

### Excel Files
- XLSX format (Excel 2007+)
- XLS format (legacy Excel)
- First sheet is automatically selected

## Column Detection

### Ticker/Symbol Detection
The parser automatically identifies ticker columns using various names:
- Symbol, Ticker, Security, Instrument
- Description, Asset Name, Security Name
- Fund Symbol, Investment Name
- And many brokerage-specific variations

### Value/Amount Detection
The parser detects dollar amounts and calculates from:
- Market Value, Current Value, Total Value
- Quantity × Price (automatically calculated)
- Cost Basis, Book Value
- And other value columns

## Not Currently Supported (Future Enhancements)

### Other Formats
- **OFX/QFX files** - Quicken/QuickBooks formats (would require additional libraries)
- **PDF statements** - Would require OCR/PDF parsing (complex)
- **JSON exports** - Some modern brokerages offer JSON APIs

### Additional Brokerages
- **Questrade** (Canada)
- **Interactive Brokers Canada**
- **International brokerages** (may need localization)
- **Crypto exchanges** (Coinbase, Binance, etc.)

## How It Works

1. **Automatic Format Detection**: Recognizes file type (CSV/XLSX)
2. **Encoding Detection**: Tries multiple encodings automatically
3. **Column Matching**: Intelligently matches columns across formats
4. **Value Calculation**: Calculates dollar amounts from shares × price if needed
5. **Data Cleaning**: Removes empty rows, handles duplicates
6. **Error Handling**: Clear error messages if parsing fails

## Testing

To test with your brokerage export:
1. Download your portfolio/positions export from your brokerage
2. Upload it using the file upload feature
3. The parser will automatically detect the format and extract holdings
4. Review the parsed holdings before analysis

If your brokerage format isn't recognized, the parser will show a helpful error message and you can still enter holdings manually.


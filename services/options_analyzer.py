from typing import Dict, List, Optional
from datetime import datetime, date
from services.tradier_connector import TradierConnector
from services.ai_options_analyzer import AIOptionsAnalyzer
from flask import current_app

class OptionsAnalyzer:
    """Core options analysis engine with scoring algorithm"""
    
    def __init__(self):
        self.tradier = TradierConnector()
        self.ai_analyzer = AIOptionsAnalyzer()
    
    def analyze_options_chain(self, symbol: str, expiration: str, 
                            preference: str = 'balanced', 
                            stock_price: float = None,
                            user_risk_tolerance: str = 'moderate') -> List[Dict]:
        """
        Analyze options chain and return scored recommendations
        
        Args:
            symbol: Stock symbol
            expiration: Expiration date (YYYY-MM-DD)
            preference: Strategy preference ('income', 'growth', 'balanced')
            stock_price: Current stock price (optional, will fetch if not provided)
            user_risk_tolerance: User's risk tolerance ('low', 'moderate', 'high')
        
        Returns:
            List of analyzed options with scores and explanations
        """
        try:
            current_app.logger.info(f'Getting stock price for {symbol}...')
        except RuntimeError:
            pass
        
        # Get stock price if not provided
        if stock_price is None:
            quote = self.tradier.get_quote(symbol)
            if 'quotes' in quote and 'quote' in quote['quotes']:
                stock_price = quote['quotes']['quote']['last']
            else:
                stock_price = 100.0  # Fallback
        
        try:
            current_app.logger.info(f'Stock price: ${stock_price}, fetching options chain for {symbol} expiration {expiration}...')
        except RuntimeError:
            pass
        
        # Get options chain
        options = self.tradier.get_options_chain(symbol, expiration)
        
        try:
            import sys
            # Log raw distribution from Tradier
            raw_calls = [
                o for o in options 
                if isinstance(o, dict) and 
                ((o.get('option_type') or o.get('type') or '').lower().strip() == 'call')
            ]
            raw_puts = [
                o for o in options 
                if isinstance(o, dict) and 
                ((o.get('option_type') or o.get('type') or '').lower().strip() == 'put')
            ]
            log_msg = (
                f'[RECOMMENDATIONS] Raw chain from Tradier: {len(options)} total '
                f'({len(raw_calls)} CALLs, {len(raw_puts)} PUTs)'
            )
            # Force console output
            print(log_msg, file=sys.stderr, flush=True)
            current_app.logger.info(log_msg)
            current_app.logger.info(f'Received {len(options)} options from chain')
        except RuntimeError:
            pass
        
        if not options:
            try:
                current_app.logger.warning(f'No options returned for {symbol} expiration {expiration}')
            except RuntimeError:
                pass
            return []
        
        # Performance optimization: Limit and pre-filter options before AI analysis
        # Only analyze top candidates to reduce API calls and processing time
        MAX_OPTIONS_TO_ANALYZE = 50  # Limit to top 50 options for AI analysis
        
        try:
            current_app.logger.info(f'Received {len(options)} options, will analyze top {MAX_OPTIONS_TO_ANALYZE} candidates')
        except RuntimeError:
            pass
        
        # Step 1: Quick pre-filter and basic scoring (no AI) for all options
        pre_analyzed = []
        for option in options:
            basic_analysis = self._analyze_option_basic(option, preference, stock_price, user_risk_tolerance, use_ai=False)
            if basic_analysis:
                # Store original option for later AI enhancement
                basic_analysis['original_option'] = option
                pre_analyzed.append(basic_analysis)
        
        # Log distribution BEFORE sorting
        try:
            pre_calls = [a for a in pre_analyzed if (a.get('contract_type') or '').lower() == 'call']
            pre_puts = [a for a in pre_analyzed if (a.get('contract_type') or '').lower() == 'put']
            current_app.logger.info(
                f'[RECOMMENDATIONS] After basic analysis: {len(pre_analyzed)} total '
                f'({len(pre_calls)} CALLs, {len(pre_puts)} PUTs)'
            )
        except RuntimeError:
            pass
        
        # Step 2: Sort by basic score and take top candidates
        pre_analyzed.sort(key=lambda x: x['score'], reverse=True)
        top_candidates = pre_analyzed[:MAX_OPTIONS_TO_ANALYZE]
        
        # Log distribution AFTER sorting (top candidates)
        try:
            import sys
            top_calls = [a for a in top_candidates if (a.get('contract_type') or '').lower() == 'call']
            top_puts = [a for a in top_candidates if (a.get('contract_type') or '').lower() == 'put']
            log_msg = (
                f'[RECOMMENDATIONS] Top {len(top_candidates)} candidates: '
                f'{len(top_calls)} CALLs, {len(top_puts)} PUTs'
            )
            # Force console output
            print(log_msg, file=sys.stderr, flush=True)
            current_app.logger.info(log_msg)
            if len(top_puts) == 0 and len(top_candidates) > 0:
                warn_msg = (
                    f'[RECOMMENDATIONS] ⚠️ No PUTs in top {len(top_candidates)} candidates! '
                    f'This may indicate scoring bias.'
                )
                print(warn_msg, file=sys.stderr, flush=True)
                current_app.logger.warning(warn_msg)
        except RuntimeError:
            pass
        
        try:
            current_app.logger.info(f'Pre-filtered to {len(top_candidates)} top candidates for AI analysis')
        except RuntimeError:
            pass
        
        # Step 3: AI analysis only for top candidates (parallel processing)
        analyzed_options = []
        import concurrent.futures
        import threading
        
        # Use ThreadPoolExecutor for parallel AI analysis
        # Reduced workers to prevent overwhelming the system
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            # Submit all AI analysis tasks
            future_to_option = {
                executor.submit(
                    self._analyze_option_with_ai,
                    option['original_option'],
                    preference,
                    stock_price,
                    user_risk_tolerance,
                    basic_analysis=option
                ): option for option in top_candidates
            }
            
            # Collect results as they complete
            for i, future in enumerate(concurrent.futures.as_completed(future_to_option)):
                try:
                    analyzed = future.result(timeout=30)  # 30 second timeout per option
                    if analyzed:
                        analyzed_options.append(analyzed)
                    if (i + 1) % 10 == 0:
                        try:
                            current_app.logger.info(f'AI analyzed {i + 1}/{len(top_candidates)} top options...')
                        except RuntimeError:
                            pass
                except Exception as e:
                    option = future_to_option[future]
                    # If AI analysis fails, use the basic analysis
                    analyzed_options.append(option)
                    try:
                        current_app.logger.warning(f'AI analysis failed for option, using basic analysis: {str(e)[:100]}')
                    except RuntimeError:
                        pass
        
        try:
            import sys
            # Log final distribution
            final_calls = [a for a in analyzed_options if (a.get('contract_type') or '').lower() == 'call']
            final_puts = [a for a in analyzed_options if (a.get('contract_type') or '').lower() == 'put']
            log_msg = (
                f'[RECOMMENDATIONS] Analysis complete: {len(analyzed_options)} options '
                f'({len(final_calls)} CALLs, {len(final_puts)} PUTs)'
            )
            # Force console output
            print(log_msg, file=sys.stderr, flush=True)
            current_app.logger.info(log_msg)
            if len(final_puts) == 0 and len(analyzed_options) > 0:
                warn_msg = (
                    f'[RECOMMENDATIONS] ⚠️ No PUTs in final recommendations! '
                    f'This indicates a bias in the recommendation algorithm.'
                )
                print(warn_msg, file=sys.stderr, flush=True)
                current_app.logger.warning(warn_msg)
        except RuntimeError:
            pass
        
        try:
            current_app.logger.info(f'Analysis complete: {len(analyzed_options)} options analyzed successfully')
        except RuntimeError:
            pass
        
        # Sort by score (highest first)
        analyzed_options.sort(key=lambda x: x['score'], reverse=True)
        
        return analyzed_options
    
    def _filter_relevant_options(self, options: List[Dict], underlying_price: float, max_options: int = 50) -> List[Dict]:
        """
        Filter large options chains to most relevant strikes.
        
        This is CRITICAL for symbols like TSLA, SPY that have 500-1000+ options.
        Reduces processing time by 5-10x while maintaining analysis quality.
        
        Strategy:
        1. Keep strikes within ±20% of current price
        2. Prioritize ATM (at-the-money) options
        3. Cap at max_options to prevent timeout
        
        Args:
            options: List of option dicts
            underlying_price: Current stock price
            max_options: Maximum options to return (default 50)
            
        Returns:
            Filtered list with most relevant options
        """
        if not options or len(options) <= max_options:
            return options
        
        try:
            current_app.logger.info(f"🔍 Large chain detected: {len(options)} options")
            current_app.logger.info(f"📊 Filtering to {max_options} most relevant strikes")
        except RuntimeError:
            pass
        
        # Separate by type - CRITICAL: Use 'option_type' first (Tradier's field)
        calls = [
            opt for opt in options 
            if isinstance(opt, dict) and
            ((opt.get('option_type') or opt.get('type') or '').lower().strip() == 'call')
        ]
        puts = [
            opt for opt in options 
            if isinstance(opt, dict) and
            ((opt.get('option_type') or opt.get('type') or '').lower().strip() == 'put')
        ]
        
        # Filter by strike range (±20% from current price)
        price_range = underlying_price * 0.20  # 20% range
        min_strike = underlying_price - price_range
        max_strike = underlying_price + price_range
        
        filtered_calls = []
        for opt in calls:
            try:
                strike = float(opt.get('strike', 0) or opt.get('strike_price', 0))
                if min_strike <= strike <= max_strike:
                    filtered_calls.append(opt)
            except (ValueError, TypeError):
                continue
        
        filtered_puts = []
        for opt in puts:
            try:
                strike = float(opt.get('strike', 0) or opt.get('strike_price', 0))
                if min_strike <= strike <= max_strike:
                    filtered_puts.append(opt)
            except (ValueError, TypeError):
                continue
        
        # If still too many, keep closest to ATM (at-the-money)
        if len(filtered_calls) + len(filtered_puts) > max_options:
            # Sort by distance from ATM, keep closest
            filtered_calls = sorted(
                filtered_calls, 
                key=lambda x: abs(float(x.get('strike', 0) or x.get('strike_price', 0)) - underlying_price)
            )[:max_options//2]
            
            filtered_puts = sorted(
                filtered_puts,
                key=lambda x: abs(float(x.get('strike', 0) or x.get('strike_price', 0)) - underlying_price)
            )[:max_options//2]
        
        filtered_options = filtered_calls + filtered_puts
        
        try:
            current_app.logger.info(
                f"✅ Filtered: {len(options)} → {len(filtered_options)} options "
                f"({len(filtered_calls)} calls, {len(filtered_puts)} puts)"
            )
        except RuntimeError:
            pass
        
        return filtered_options
    
    def _analyze_option_basic(self, option: Dict, preference: str, stock_price: float, user_risk_tolerance: str = 'moderate', use_ai: bool = False) -> Optional[Dict]:
        """Analyze a single option contract with basic scoring (no AI)"""
        return self._analyze_option(option, preference, stock_price, user_risk_tolerance, use_ai=use_ai)
    
    def _analyze_option_with_ai(self, original_option: Dict, preference: str, stock_price: float, user_risk_tolerance: str, basic_analysis: Dict = None) -> Optional[Dict]:
        """Enhance basic analysis with AI - used for parallel processing"""
        if basic_analysis:
            # Start with basic analysis and enhance with AI
            result = basic_analysis.copy()
        else:
            # Do basic analysis first
            result = self._analyze_option(original_option, preference, stock_price, user_risk_tolerance, use_ai=False)
            if not result:
                return None
        
        # Add AI analysis
        try:
            # Extract data from result for AI analysis
            contract_type = result.get('contract_type', '')
            strike = result.get('strike', 0)
            mid_price = result.get('mid_price', 0)
            bid = result.get('bid', 0)
            ask = result.get('ask', 0)
            last_price = result.get('last_price', 0)
            volume = result.get('volume', 0)
            open_interest = result.get('open_interest', 0)
            
            ai_analysis = self.ai_analyzer.analyze_option_with_ai(
                option={
                    'type': contract_type,
                    'strike': strike,
                    'expiration_date': result.get('expiration_date', ''),
                    'mid_price': mid_price,
                    'bid': bid,
                    'ask': ask,
                    'last': last_price,
                    'volume': volume,
                    'open_interest': open_interest,
                    'greeks': {
                        'delta': result.get('delta', 0),
                        'gamma': result.get('gamma', 0),
                        'theta': result.get('theta', 0),
                        'vega': result.get('vega', 0),
                        'mid_iv': result.get('implied_volatility', 0)
                    }
                },
                stock_price=stock_price,
                user_risk_tolerance=user_risk_tolerance
            )
            
            if ai_analysis:
                # Merge AI analysis into result
                result['ai_analysis'] = ai_analysis
                # Update explanation if AI provides one
                if 'explanation' in ai_analysis:
                    result['explanation'] = ai_analysis['explanation']
                # Update category if AI provides a valid one
                ai_category = ai_analysis.get('category', '')
                if ai_category in ['Conservative', 'Balanced', 'Aggressive']:
                    result['category'] = ai_category
        except Exception as e:
            # If AI fails, keep basic analysis
            try:
                from flask import current_app
                current_app.logger.warning(f'AI analysis failed, using basic: {str(e)[:100]}')
            except RuntimeError:
                pass
        
        return result
    
    def _analyze_option(self, option: Dict, preference: str, stock_price: float, user_risk_tolerance: str = 'moderate', use_ai: bool = True) -> Optional[Dict]:
        """Analyze a single option contract"""
        try:
            # Extract option data - handle None values
            # CRITICAL FIX: Tradier uses 'option_type', not 'type'
            contract_type = (
                option.get('option_type') or      # ← Tradier uses this
                option.get('type') or              # Fallback
                option.get('contract_type') or     # Another fallback
                ''
            ).lower().strip()
            strike = float(option.get('strike') or 0)
            last_price = float(option.get('last') or 0)
            bid = float(option.get('bid') or 0)
            ask = float(option.get('ask') or 0)
            volume = int(option.get('volume') or 0)
            open_interest = int(option.get('open_interest') or 0)
            
            # Extract Greeks - handle None values
            greeks = option.get('greeks', {}) or {}
            delta = float(greeks.get('delta') or 0)
            gamma = float(greeks.get('gamma') or 0)
            theta = float(greeks.get('theta') or 0)
            vega = float(greeks.get('vega') or 0)
            iv = float(greeks.get('mid_iv') or greeks.get('iv') or 0)
            
            # Calculate spread
            if bid > 0 and ask > 0:
                mid_price = (bid + ask) / 2
                spread = ask - bid
                spread_percent = (spread / mid_price * 100) if mid_price > 0 else 100
            else:
                mid_price = last_price
                spread_percent = 15.0  # Default penalty for no bid/ask
            
            # Calculate days to expiration
            expiration_date = datetime.strptime(option.get('expiration_date', ''), '%Y-%m-%d').date()
            days_to_expiration = (expiration_date - date.today()).days
            
            # Score the option
            score = self._score_option(
                volume=volume,
                open_interest=open_interest,
                spread_percent=spread_percent,
                days_to_expiration=days_to_expiration,
                delta=delta,
                preference=preference
            )
            
            # Generate explanation
            explanation = self._generate_explanation(
                option=option,
                score=score,
                preference=preference,
                spread_percent=spread_percent,
                days_to_expiration=days_to_expiration,
                delta=delta,
                volume=volume,
                open_interest=open_interest
            )
            
            # Determine category based on calculated score
            category = self._categorize_recommendation(score)
            
            # Store original option for AI analysis if needed
            original_option = option.copy()
            
            # Get AI-powered analysis (only if use_ai is True)
            ai_analysis = None
            if use_ai:
                try:
                    ai_analysis = self.ai_analyzer.analyze_option_with_ai(
                        option={
                            'type': contract_type,
                            'strike': strike,
                            'expiration_date': option.get('expiration_date'),
                            'mid_price': mid_price,
                            'bid': bid,
                            'ask': ask,
                            'last': last_price,
                            'volume': volume,
                            'open_interest': open_interest,
                            'greeks': greeks
                        },
                        stock_price=stock_price,
                        user_risk_tolerance=user_risk_tolerance
                    )
                    
                    # Use AI analysis for explanation if available
                    # But keep the calculated score (don't override with AI score)
                    # Only use AI category if it's valid (Conservative, Balanced, Aggressive)
                    if ai_analysis:
                        explanation = ai_analysis.get('explanation', explanation)
                        ai_category = ai_analysis.get('category', category)
                        # Only use AI category if it matches our expected values
                        if ai_category in ['Conservative', 'Balanced', 'Aggressive']:
                            category = ai_category
                        # Keep the calculated score - don't override with AI score
                        # This ensures scores vary based on actual option characteristics
                except Exception as e:
                    # Log error but don't fail the entire analysis
                    try:
                        from flask import current_app
                        current_app.logger.error(f"AI analysis error: {str(e)}")
                    except:
                        pass
                    ai_analysis = {}
            
            result = {
                'option_symbol': option.get('symbol'),
                'description': option.get('description'),
                'contract_type': contract_type,
                'original_option': original_option,  # Store for later AI enhancement
                'strike': strike,
                'expiration_date': option.get('expiration_date'),
                'last_price': last_price,
                'bid': bid,
                'ask': ask,
                'mid_price': mid_price,
                'spread': spread if bid > 0 and ask > 0 else None,
                'spread_percent': spread_percent,
                'volume': volume,
                'open_interest': open_interest,
                'delta': delta,
                'gamma': gamma,
                'theta': theta,
                'vega': vega,
                'implied_volatility': iv,
                'days_to_expiration': days_to_expiration,
                'score': round(score, 4),
                'category': category,
                'explanation': explanation,
                'stock_price': stock_price,
                'ai_analysis': ai_analysis  # Add AI analysis
            }
            
            return result
        except Exception as e:
            try:
                from flask import current_app
                current_app.logger.error(f"Error analyzing option: {str(e)}")
            except:
                pass
            return None
    
    def _score_option(self, volume: int, open_interest: int, spread_percent: float,
                     days_to_expiration: int, delta: float, preference: str) -> float:
        """
        Score option based on multiple factors (0-1.0 scale)
        
        Scoring breakdown:
        - Liquidity: 0-0.3 (volume and open interest)
        - Spread: 0-0.2 (lower spread is better)
        - Days to expiration: 0-0.2 (preference-based)
        - Delta: 0-0.3 (strategy-based target)
        """
        # Liquidity score (0-0.3)
        # Volume > 20 and OI > 100 are considered good
        volume_score = min(0.15, (volume / 100) * 0.15) if volume > 0 else 0
        oi_score = min(0.15, (open_interest / 500) * 0.15) if open_interest > 0 else 0
        liquidity_score = volume_score + oi_score
        
        # Spread score (0-0.2) - lower spread is better
        # Spread < 10% gets full score, > 15% gets penalized
        spread_score = 0.2 * max(0, 1 - (spread_percent / 10))
        
        # Days to expiration relevance (0-0.2)
        if preference == 'income':
            # Income strategies prefer shorter DTE (around 21 days)
            days_score = 0.2 * max(0, 1 - abs(21 - days_to_expiration) / 30)
        elif preference == 'growth':
            # Growth strategies prefer longer DTE (up to 60 days)
            days_score = 0.2 * min(1, days_to_expiration / 60)
        else:  # balanced
            # Balanced strategies prefer 30-45 DTE
            days_score = 0.2 * max(0, 1 - abs(38 - days_to_expiration) / 30)
        
        # Delta score (0-0.3)
        # Target deltas based on preference
        target_deltas = {
            'income': 0.35,
            'growth': 0.65,
            'balanced': 0.50
        }
        target_delta = target_deltas.get(preference, 0.50)
        # Use absolute delta for scoring
        abs_delta = abs(delta)
        delta_score = 0.3 * max(0, 1 - abs(target_delta - abs_delta) / 0.35)
        
        total_score = liquidity_score + spread_score + days_score + delta_score
        return min(1.0, max(0.0, total_score))
    
    def _generate_explanation(self, option: Dict, score: float, preference: str,
                            spread_percent: float, days_to_expiration: int,
                            delta: float, volume: int, open_interest: int) -> str:
        """Generate plain English explanation for the recommendation"""
        # CRITICAL FIX: Use 'option_type' first (Tradier's field)
        contract_type = (
            option.get('option_type') or
            option.get('type') or
            option.get('contract_type') or
            ''
        ).lower().strip()
        strike = option.get('strike')
        
        explanations = []
        
        # Score-based opening
        if score >= 0.7:
            explanations.append("This is a strong option with excellent characteristics.")
        elif score >= 0.5:
            explanations.append("This option shows good potential with solid fundamentals.")
        else:
            explanations.append("This option has some limitations but may still be viable.")
        
        # Liquidity assessment
        if volume >= 20 and open_interest >= 100:
            explanations.append(f"Good liquidity with {volume} contracts traded and {open_interest} open interest.")
        elif volume < 20:
            explanations.append(f"Low volume ({volume} contracts) may make entry/exit more challenging.")
        elif open_interest < 100:
            explanations.append(f"Low open interest ({open_interest}) suggests limited market participation.")
        
        # Spread assessment
        if spread_percent < 5:
            explanations.append("Tight bid-ask spread indicates efficient pricing.")
        elif spread_percent < 10:
            explanations.append("Reasonable spread, though you may pay a small premium.")
        else:
            explanations.append(f"Wide spread ({spread_percent:.1f}%) means you'll pay more to enter/exit.")
        
        # DTE assessment
        if preference == 'income':
            if 15 <= days_to_expiration <= 30:
                explanations.append(f"Good DTE ({days_to_expiration} days) for income generation.")
            else:
                explanations.append(f"DTE of {days_to_expiration} days may not be optimal for income strategies.")
        elif preference == 'growth':
            if days_to_expiration >= 45:
                explanations.append(f"Longer DTE ({days_to_expiration} days) provides time for growth.")
            else:
                explanations.append(f"Shorter DTE ({days_to_expiration} days) may limit growth potential.")
        else:  # balanced
            if 30 <= days_to_expiration <= 45:
                explanations.append(f"Optimal DTE range ({days_to_expiration} days) for balanced approach.")
            else:
                explanations.append(f"DTE of {days_to_expiration} days is outside the ideal range.")
        
        # Delta assessment
        abs_delta = abs(delta)
        if preference == 'income':
            if 0.30 <= abs_delta <= 0.40:
                explanations.append(f"Delta of {delta:.2f} is ideal for income strategies.")
            else:
                explanations.append(f"Delta of {delta:.2f} may not align perfectly with income goals.")
        elif preference == 'growth':
            if 0.60 <= abs_delta <= 0.70:
                explanations.append(f"Delta of {delta:.2f} provides good growth potential.")
            else:
                explanations.append(f"Delta of {delta:.2f} may not maximize growth opportunities.")
        else:  # balanced
            if 0.45 <= abs_delta <= 0.55:
                explanations.append(f"Delta of {delta:.2f} offers balanced risk/reward.")
            else:
                explanations.append(f"Delta of {delta:.2f} is slightly outside the balanced range.")
        
        return " ".join(explanations)
    
    def _categorize_recommendation(self, score: float) -> str:
        """Categorize recommendation based on score"""
        if score >= 0.7:
            return 'Aggressive'
        elif score >= 0.5:
            return 'Balanced'
        else:
            return 'Conservative'


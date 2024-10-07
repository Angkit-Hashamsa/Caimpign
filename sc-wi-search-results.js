class WI_Search_Results_Page {
  /**
   * Creates an instance of WI_Search_Results_Page.
   * Initializes slider and dropdown search on DOMContentLoaded event.
   */
  init() {
    document.addEventListener('DOMContentLoaded', async () => {
      console.log('Called');
      this.currentPage = 1;
      this.searchResults = [];
      this.searchResultsCounter = 0;
      // Till 992px we will have mobile/tablet view.
      this.mobile_viewport_size = 992;

      this.autoSuggestInput = document.querySelector('.sc-wi-search-results__input');
      this.clearSearchResults = document.querySelector('.sc-wi-search-results__clear');
      this.searchButton = document.querySelector('.sc-wi-search-results__button');

      this.inputContainer = document.querySelector('.sc-wi-search-results__input-container');
      this.autoSuggestResults = document.querySelector('.sc-wi-search-results__result-suggestions');

      this.resultsCounter = document.querySelector('.sc-wi-search-results__result-counter');
      this.articlesContainer = document.querySelector('.sc-wi-search-results__articles-main');
      this.popularArticlesContainer = document.querySelector(
        '.sc-wi-search-results__popular-articles'
      );
      this.popular_articles_view_more_button = document.querySelector(
        '.sc-wi-search-results__more'
      );

      this.noResultsContainer = document.createElement('div');
      this.paginationContainer = document.querySelector('.sc-wi-search-results__pagination');

      this.dynamicSpan = document.querySelector('.sc-wi-search__dynamic-data');

      if (this.dynamicSpan) {
        this.minInputCharacters = parseInt(
          this.dynamicSpan.getAttribute('min-input-characters'),
          10
        );
        this.prevButtonLabel = this.dynamicSpan.getAttribute('pagination-prev-label');
        this.nextButtonLabel = this.dynamicSpan.getAttribute('pagination-next-label');
        this.viewMoreArticles = this.dynamicSpan.getAttribute('view-more-details');
        this.resultsPerPage = parseInt(
          this.dynamicSpan.getAttribute('pagination-results-per-page'),
          10
        );

        this.search_no_results_svg = this.dynamicSpan.getAttribute('search-no-results-svg');
        this.search_no_results_heading = this.dynamicSpan.getAttribute('search-no-results-heading');
        this.search_no_results_message = this.dynamicSpan.getAttribute('search-no-results-message');

        this.popular_articles_view_more_label = this.dynamicSpan.getAttribute(
          'popular-articles-show-more'
        );
        this.popular_articles_view_less_label = this.dynamicSpan.getAttribute(
          'popular-articles-show-less'
        );

        this.jsonURL = this.dynamicSpan.getAttribute('search-json-url');
        this.search_results_location = this.dynamicSpan.getAttribute('search-results-page-url');

        console.log(this.jsonURL);
        if (this.jsonURL) {
          await this.fetch_json_data_from_url(this.jsonURL);
        }
      }

      this.check_and_load_search_results();
      this.add_event_listeners();
    });
  }

  // Fetch search URL JSON data for performing search operations.
  async fetch_json_data_from_url(url) {
    if (!url) {
      return;
    }
    const username = 'webdesign';
    const password = 'web2021'
    const headers = new Headers();
    const encodedCredentials = btoa(`${username}:${password}`);
    headers.append('Authorization', `Basic ${encodedCredentials}`);
    try {
      const response = await fetch(url, {headers});

      if (!response.ok) {
        throw new Error('Network issue, try refreshing again!');
      }

      const data = await response.json();
      this.searchData = data;
    } catch (error) {
      console.error('JSON URL Not found: ', error?.message);
    }
  }

  debounce(func, delay) {
    let timer;

    return function() {
      const context = this;
      const args = arguments;

      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(context, args);
      }, delay);
    };
  }

  highlight_matching_text_in_autosuggest_dropdown(input_value, text_to_highlight) {
    const highlighterClass = 'sc-wi-search-results__highlight';

    const regex = new RegExp(`(${input_value})`, 'gi');
    const parts = text_to_highlight?.title.split(regex);

    return parts.reduce((acc, part) => {
      if (part.toLowerCase() === input_value.toLowerCase()) {
        return acc + `<span class="${highlighterClass}">${part}</span>`;
      }

      return acc + part;
    }, '');
  }

  show_auto_suggest_results(input_value, auto_suggest_html_instance) {
    if (!input_value || !auto_suggest_html_instance) {
      return;
    }

    const that = this;

    this?.searchResults?.forEach(match => {
      const li = document.createElement('li');
      const anchor = document.createElement('a');

      anchor.innerHTML = that.highlight_matching_text_in_autosuggest_dropdown(input_value, match);
      anchor.setAttribute('href', match.url);

      anchor.addEventListener('mousedown', event => {
        event.preventDefault();
      });

      anchor.addEventListener('click', event => {
        event.preventDefault();
        window.open(match.url, '_blank');
      });

      li.appendChild(anchor);
      auto_suggest_html_instance.appendChild(li);
    });

    return auto_suggest_html_instance;
  }

  search_in_json(input_value) {
    const excludeKeys = ['post_id', 'date', 'readTime'];
    const input = input_value.toLowerCase();
    this.searchResults = [];

    // Recursive function to to perform a deep search - DFS alogorithm.
    const deepSearch = (obj, input) => {
      for (const key in obj) {
        if (!excludeKeys.includes(key)) {
          const value = obj[key];
          if (Array.isArray(value)) {
            for (const item of value) {
              if (typeof item === 'string' && item.toLowerCase().includes(input)) {
                return true;
              } else if (typeof item === 'object' && item !== null && deepSearch(item, input)) {
                return true;
              }
            }
          } else if (typeof value === 'object' && value !== null) {
            if (deepSearch(value, input)) {
              return true;
            }
          } else if (typeof value === 'string' && value.toLowerCase().includes(input)) {
            return true;
          }
        }
      }

      return false;
    };

    this?.searchData?.forEach(article => {
      if (deepSearch(article, input)) {
        this.searchResults.push(article);
      }
    });
  }

  handle_search_cta_click() {
    const inputValue = this.autoSuggestInput.value.trim().toLowerCase();

    if (inputValue.length >= this.minInputCharacters) {
      const url = new URL(window.location.href);

      url.searchParams.set('search', inputValue);

      // Replace current URL in browser history with new structure.
      window.history.replaceState(null, '', url.toString());

      this.currentPage = 1;
      this.update_pagination_and_content(this.searchResults);
    }
  }

  // Add articles on page UI.
  generate_articles(searchResults) {
    const that = this;
    const container = document.querySelector('.sc-wi-search-results__articles');

    container.innerHTML = '';

    if (!searchResults.length) return;

    let fragment = document.createDocumentFragment();

    searchResults.forEach((result, index) => {
      const article = document.createElement('div');
      article.classList.add('sc-wi-search-results__articles-article');

      article.innerHTML = `
          <div class="sc-wi-search-results__articles-article-left">
            <a href="${result?.url}" target="_blank">
              <img src="${result?.image}" alt="${result?.title}"  />
            </a>
          </div>
          <div class="sc-wi-search-results__articles-article-right">
            <div class="sc-wi-search-results__articles-article-body">
              ${
                result?.['article-categories']?.length > 0
                  ? (() => {
                      let htmlContent = '<div class="sc-wi-search-results__articles-article-tags">';
                      const html = [];

                      result['article-categories'].forEach(category => {
                        html.push(
                          `<a href="${that.search_results_location}?search=${encodeURIComponent(
                            category?.name
                          )}" title="${category?.name}">
                              <span>${category?.name}</span>
                            </a>`
                        );
                        // Render sub-categories if they exist
                        if (category['sub-categories']) {
                          category['sub-categories'].forEach(subCategory => {
                            html.push(
                              `<a href="${that.search_results_location}?search=${encodeURIComponent(
                                subCategory?.name
                              )}" title="${subCategory?.name}">
                                  <span>${subCategory?.name}</span>
                                </a>`
                            );
                          });
                        }
                      });

                      return htmlContent + html.join('') + '</div>';
                    })()
                  : ''
              }
              <div class="sc-wi-search-results__articles-article-title-and-meta">
                ${
                  result?.title
                    ? `<h4>
                      <a href="${result?.url}" target="_blank">
                        ${result?.title}
                      </a>
                    </h4>`
                    : ''
                }
                <div class="sc-wi-search-results__articles-article-meta-data">
                  <span class="sc-wi-search-results__date">${result?.date || ''}</span>
                  <span></span>
                  <span class="sc-wi-search-results__read-time">${result?.readTime || ''}</span>
                </div>
              </div>
              ${result?.description ? `<p>${result?.description}</p>` : ''}
            </div>
            <div class="sc-wi-search-results__articles-article-footer">
              <div class="sc-wi-search-results__articles-article-footer-read-more">
                <a href="${result.url}" target="_blank">
                  ${this.viewMoreArticles || ''}
                </a>
              </div>
            </div>
          </div>
        `;

      fragment.appendChild(article);

      if (index < searchResults.length - 1) {
        const separator = document.createElement('div');
        separator.classList.add('sc-wi-search-results__articles-separator');
        fragment.appendChild(separator);
      }
    });

    container.appendChild(fragment);

    // Clean up references to temporary elements
    fragment.childNodes.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        child.innerHTML = '';
      }
    });

    while (fragment.firstChild) {
      fragment.removeChild(fragment.firstChild);
    }

    fragment = null;
  }

  generate_pagination(searchResults) {
    const that = this;

    this.paginationContainer.innerHTML = '';

    const totalResults = searchResults.length;
    const totalPages = Math.ceil(totalResults / that.resultsPerPage);

    if (totalPages <= 1) {
      this.paginationContainer.classList.add('hidden');
      return;
    }

    // Previous button.
    const prevButton = document.createElement('button');

    prevButton.classList.add('sc-wi-search-results__pagination-prev');
    prevButton.textContent = this.prevButtonLabel;

    if (this.currentPage === 1) {
      prevButton.classList.add('sc-wi-search-results__pagination-prev-inactive');
    }

    prevButton.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.update_pagination_and_content(searchResults);
      }
    });

    this.paginationContainer.appendChild(prevButton);

    // Pagination number buttons.
    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement('button');

      pageButton.classList.add('sc-wi-search-results__pagination-number');

      if (i === that.currentPage) {
        pageButton.classList.add('sc-wi-search-results__pagination-number-active');
      }

      pageButton.textContent = i;
      pageButton.addEventListener('click', () => {
        that.currentPage = i;
        that.update_pagination_and_content(searchResults);
      });

      that.paginationContainer.appendChild(pageButton);
    }

    // Next button.
    const nextButton = document.createElement('button');

    nextButton.classList.add('sc-wi-search-results__pagination-next');
    nextButton.textContent = this.nextButtonLabel;

    if (this.currentPage === totalPages) {
      nextButton.classList.add('sc-wi-search-results__pagination-next-inactive');
    }

    nextButton.addEventListener('click', () => {
      if (that.currentPage < totalPages) {
        that.currentPage++;
        that.update_pagination_and_content(searchResults);
      }
    });

    that.paginationContainer.appendChild(nextButton);

    if (this.paginationContainer.classList.contains('hidden')) {
      this.paginationContainer.classList.remove('hidden');
    }
  }

  // This will clear search input keyword + remove search param from URL if it exists.
  clear_search_input_and_url_parameter() {
    this.autoSuggestInput.value = '';
    this.autoSuggestInput.style.paddingRight = '';

    this.clearSearchResults.classList.remove('active');
  }

  // Upon page load, if there is any keyword present in URL, we will load results based on it.
  check_and_load_search_results() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const search_parameter = params.get('search');

    if (search_parameter?.length > 0) {
      this.autoSuggestInput.value = search_parameter;
      this.autoSuggestInput.style.paddingRight = '120px';
      this.clearSearchResults.classList.add('active');

      this.search_in_json(search_parameter);
      this.update_pagination_and_content(this?.searchResults);
    } else {
      this.handle_no_results_found();
      this?.toggle_popular_articles_section();
      this?.slide_back_to_main_articles_section();
    }
  }

  handle_no_results_found() {
    // Let's create new element for No results container view.
    this.noResultsContainer.className = 'sc-wi-search-results__no-results-box';
    this.noResultsContainer.innerHTML = `
      <div class="sc-wi-search-results__no-results-box-wrapper">
        <div class="sc-wi-search-results__no-results-box-svg">
          <img
            src="${this.search_no_results_svg}"
            title="${this.search_no_results_heading}"
            alt="${this.search_no_results_heading}"
          />
        </div>
        <div class="sc-wi-search-results__no-results-box-text">
            <div class="sc-wi-search-results__no-results-box-heading">
                ${this.search_no_results_heading}
            </div>
            <div class="sc-wi-search-results__no-results-box-message">
                ${this.search_no_results_message}
            </div>
        </div>
      </div>
    `;

    this.articlesContainer.classList.add('hidden');
    this.paginationContainer.classList.add('hidden');

    this.articlesContainer.insertAdjacentElement('afterend', this.noResultsContainer);

    // Trigger a reflow to enable smooth transition and show noResultsContainer.
    void this.noResultsContainer.offsetWidth;
    this.noResultsContainer.classList.add('show');
  }

  handle_revert_no_results_found() {
    // Reset no results container if it exists
    if (this.noResultsContainer) {
      this.noResultsContainer.remove();
      this.noResultsContainer = document.createElement('div');
    }

    this.articlesContainer.classList.remove('hidden');
    this.paginationContainer.classList.remove('hidden');
  }

  slide_back_to_main_articles_section(scroll_flag = true) {
    if (!scroll_flag) {
      return;
    }

    const scroll_here = document.querySelector('.sc-wi-search-results__slide-back-here');

    // Default to mobile mode.
    let viewport_difference = 10;

    // For desktop mode since the navigation is sticky we need to add a difference.
    if (window?.innerWidth > 1023) {
      viewport_difference = 120;
    }

    const _scrollOptions = {
      top: scroll_here?.getBoundingClientRect()?.top + window?.scrollY - viewport_difference,
      behavior: 'smooth'
    };

    window.scrollTo(_scrollOptions);
  }

  toggle_popular_articles_section(main_articles_count = 0, toggle_popular_articles = true) {
    if (
      !this.popularArticlesContainer ||
      window.innerwidth < this.mobile_viewport_size + 1 ||
      !toggle_popular_articles
    ) {
      return;
    }

    const toggle_popular_articles_container_class = add_toggle_class_for_popular_articles => {
      if (add_toggle_class_for_popular_articles) {
        this.popularArticlesContainer.classList.add('sc-wi-search-results__no-results');
        this.popular_articles_view_more_button.textContent = this.popular_articles_view_more_label;
      } else {
        this.popularArticlesContainer.classList.remove('sc-wi-search-results__no-results');
        this.popular_articles_view_more_button.textContent = this.popular_articles_view_less_label;
      }
    };

    // If article count is zero we need to revert the articles section toggle status to default.
    if (main_articles_count === 0) {
      if (!this.popularArticlesContainer.classList.contains('sc-wi-search-results__no-results')) {
        toggle_popular_articles_container_class(true);
      } else {
        // TODO: This else section makes popular articles toggle if no search results are found.
        toggle_popular_articles_container_class(false);
      }

      return;
    }

    // We will take care of articles defined cases in this logic section.
    if (main_articles_count > 0 && main_articles_count <= 4) {
      if (!this.popularArticlesContainer.classList.contains('sc-wi-search-results__no-results')) {
        toggle_popular_articles_container_class(true);
      }
    } else if (main_articles_count > 4) {
      if (this.popularArticlesContainer.classList.contains('sc-wi-search-results__no-results')) {
        toggle_popular_articles_container_class(false);
      }
    }
  }

  toggle_active_status_of_elements(active = true) {
    this?.autoSuggestResults.classList.toggle('active', active);
    this?.inputContainer.classList.toggle('active', active);
  }

  update_articles_counter(counter = 0) {
    if (this?.resultsCounter) {
      this.resultsCounter.classList.add('updating');

      setTimeout(() => {
        this.resultsCounter.textContent = counter;

        this.resultsCounter.classList.remove('updating');
      }, 500);
    }
  }

  update_pagination_and_content(search_results = []) {
    const number_of_results = search_results?.length || 0;

    if (number_of_results > 0) {
      const start_index = (this?.currentPage - 1) * this?.resultsPerPage;
      const end_index = start_index + this?.resultsPerPage;
      const paginated_results = search_results.slice(start_index, end_index);

      this?.update_articles_counter(number_of_results);
      this?.toggle_popular_articles_section(number_of_results);
      this?.generate_articles(paginated_results);
      this?.generate_pagination(search_results);
      this?.slide_back_to_main_articles_section();

      if (document.querySelector('.sc-wi-search-results__no-results-box.show')) {
        this?.handle_revert_no_results_found();
      }
    } else {
      this?.handle_no_results_found();
      this?.toggle_popular_articles_section();
    }
  }

  check_and_set_clear_icon(input_value = '') {
    if (input_value?.length > 0) {
      this.clearSearchResults.classList.add('active');
      this.autoSuggestInput.style.paddingRight = '120px';

      return;
    }

    this.clearSearchResults.classList.remove('active');
    this.autoSuggestInput.style.paddingRight = '';
  }

  // -------- Event Listeners Section -------- //
  add_event_to_search_input() {
    if (!this?.autoSuggestInput) {
      return;
    }

    let original_placeholder = this.autoSuggestInput.placeholder;

    this?.autoSuggestInput.addEventListener(
      'focus',
      function() {
        this.autoSuggestInput.placeholder = '';
      }.bind(this)
    );

    this?.autoSuggestInput.addEventListener(
      'blur',
      function() {
        this.autoSuggestInput.placeholder = original_placeholder;
      }.bind(this)
    );
  }

  add_event_to_search_cta() {
    if (!this?.searchButton) {
      return;
    }

    this?.searchButton.addEventListener(
      'click',
      function() {
        this.handle_search_cta_click();
      }.bind(this)
    );
  }

  add_event_to_clear_results_icon() {
    if (!this?.clearSearchResults) {
      return;
    }

    this?.clearSearchResults.addEventListener(
      'mousedown',
      function(event) {
        event.preventDefault();
        this.autoSuggestResults.innerHTML = '';
        this.clear_search_input_and_url_parameter();
        this.toggle_active_status_of_elements(false);
      }.bind(this)
    );
  }

  add_event_to_auto_suggest_dropdown() {
    this?.autoSuggestInput.addEventListener(
      'input',
      this.debounce(
        function() {
          const inputValue = this.autoSuggestInput.value.trim().toLowerCase();
          this.check_and_set_clear_icon(inputValue);

          this.autoSuggestResults.innerHTML = '';

          if (inputValue.length < this.minInputCharacters) {
            this.toggle_active_status_of_elements(false);

            return;
          }

          this.search_in_json(inputValue);
          const autoSuggestions = this.show_auto_suggest_results(
            inputValue,
            this?.autoSuggestResults
          );

          if (autoSuggestions.children[0] !== undefined) {
            this.toggle_active_status_of_elements();
          } else {
            this.toggle_active_status_of_elements(false);
          }
        }.bind(this),
        300
      )
    );

    this?.autoSuggestInput.addEventListener(
      'blur',
      function(event) {
        if (!this.autoSuggestResults.contains(event.relatedTarget)) {
          this.autoSuggestResults.innerHTML = '';
          this.toggle_active_status_of_elements(false);
        }
      }.bind(this)
    );

    this?.autoSuggestInput.addEventListener(
      'keydown',
      function(event) {
        if (event.key === 'Enter') {
          this.handle_search_cta_click();
          // this.currentPage = 1;
          // this.update_pagination_and_content(this.searchResults);
          this.autoSuggestResults.innerHTML = '';
          this.toggle_active_status_of_elements(false);
        }
      }.bind(this)
    );
  }

  add_event_to_auto_suggest_results() {
    if (this?.autoSuggestResults) {
      this?.autoSuggestResults.addEventListener('mousedown', event => {
        event.preventDefault();
      });
    }
  }

  add_event_to_popular_articles_cta() {
    if (this?.popular_articles_view_more_button) {
      this.popular_articles_view_more_button.addEventListener('click', () => {
        this.toggle_popular_articles_section();
      });
    }
  }

  add_event_listeners() {
    this?.add_event_to_search_input();
    this?.add_event_to_search_cta();
    this?.add_event_to_clear_results_icon();
    this?.add_event_to_auto_suggest_dropdown();
    this?.add_event_to_auto_suggest_results();
    this?.add_event_to_popular_articles_cta();
  }
}

// Create an instance of WI_Search_Results_Page
const instance = new WI_Search_Results_Page();
instance.init();
// export default instance;

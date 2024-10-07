class WI_Filter_Results_Page {
  /**
   * Creates an instance of WI_Filter_Results_Page.
   * Initializes slider and dropdown search on DOMContentLoaded event.
   */
  init() {
    document.addEventListener('DOMContentLoaded', async () => {
      this.currentPage = 1;
      this.searchResults = [];
      this.searchResultsCounter = 0;
      // Till 992px we will have mobile/tablet view.
      this.mobile_viewport_size = 992;

      this.searchButton = document.querySelector('.sc-wi-filter-results__button');

      this.articlesContainer = document.querySelector('.sc-wi-filter-results__articles-main');
      this.popularArticlesContainer = document.querySelector(
        '.sc-wi-filter-results__popular-articles'
      );
      this.popular_articles_view_more_button = document.querySelector(
        '.sc-wi-filter-results__more'
      );

      this.noResultsContainer = document.createElement('div');
      this.paginationContainer = document.querySelector('.sc-wi-filter-results__pagination');

      this.dynamicSpan = document.querySelector('.sc-wi-filter-results__dynamic-data');

      if (this?.dynamicSpan) {
        this.l2_filter_placeholder = this.dynamicSpan.getAttribute('l2_filter_placeholder');
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

        this.filter_no_results_svg = this.dynamicSpan.getAttribute('filter-no-results-svg');
        this.filter_no_results_heading = this.dynamicSpan.getAttribute('filter-no-results-heading');
        this.filter_no_results_message = this.dynamicSpan.getAttribute('filter-no-results-message');

        this.popular_articles_view_more_label = this.dynamicSpan.getAttribute(
          'popular-articles-show-more'
        );
        this.popular_articles_view_less_label = this.dynamicSpan.getAttribute(
          'popular-articles-show-less'
        );

        this.jsonURL = this.dynamicSpan.getAttribute('recommended-json-url');
        this.search_results_location = this.dynamicSpan.getAttribute('filter-results-page-url');

        if (this.jsonURL) {
          await this.fetch_json_data_from_url(this.jsonURL);
        }
      }

      // Since we are use this as a callback function, we need to bind this to keep reference intact.
      this.handle_article_population = this.handle_article_population.bind(this);

      this.check_and_load_filter_results();
      this.add_event_listeners();
    });
  }

  // Fetch search URL JSON data for performing search operations.
  async fetch_json_data_from_url(url) {
    if (!url) {
      return;
    }

    try {
      const response = await fetch(url);

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

  search_in_json(l1_slug, l2_slug) {
    this.searchResults = [];

    // Function to check for slugs in recommended-categories
    const checkSlugs = (categories, l1, l2) => {
      return categories.some(category => category.slug === l1 || category.slug === l2);
    };

    // Main search loop
    this?.searchData?.forEach(article => {
      if (
        article['recommended-categories'] &&
        checkSlugs(article['recommended-categories'], l1_slug, l2_slug)
      ) {
        this.searchResults.push(article);
      }
    });
  }

  // Add articles on page UI.
  generate_articles(searchResults) {
    const that = this;
    const container = document.querySelector('.sc-wi-filter-results__articles');

    container.innerHTML = '';

    if (!searchResults.length) return;

    let fragment = document.createDocumentFragment();

    searchResults.forEach((result, index) => {
      const article = document.createElement('div');
      article.classList.add('sc-wi-filter-results__articles-article');

      article.innerHTML = `
          <div class="sc-wi-filter-results__articles-article-left">
            <a href="${result?.url}" target="_blank">
              <img src="${result?.image}" alt="${result?.title}" />
            </a>
          </div>
          <div class="sc-wi-filter-results__articles-article-right">
            <div class="sc-wi-filter-results__articles-article-body">
              ${
                result?.['article-categories']?.length > 0
                  ? (() => {
                      let htmlContent = '<div class="sc-wi-filter-results__articles-article-tags">';
                      const html = [];

                      result['article-categories'].forEach(category => {
                        html.push(
                          `<a href="${that.search_results_location}?filter=${encodeURIComponent(
                            category?.name
                          )}" title="${category?.name}">
                              <span>${category?.name}</span>
                            </a>`
                        );
                        // Render sub-categories if they exist
                        if (category['sub-categories']) {
                          category['sub-categories'].forEach(subCategory => {
                            html.push(
                              `<a href="${that.search_results_location}?filter=${encodeURIComponent(
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
              <div class="sc-wi-filter-results__articles-article-title-and-meta">
                ${
                  result?.title
                    ? `<h4>
                      <a href="${result?.url}" target="_blank">
                        ${result?.title}
                      </a>
                    </h4>`
                    : ''
                }
                <div class="sc-wi-filter-results__articles-article-meta-data">
                  <span class="sc-wi-filter-results__date">${result?.date || ''}</span>
                  <span></span>
                  <span class="sc-wi-filter-results__read-time">${result?.readTime || ''}</span>
                </div>
              </div>
              ${result?.description ? `<p>${result?.description}</p>` : ''}
            </div>
            <div class="sc-wi-filter-results__articles-article-footer">
              <div class="sc-wi-filter-results__articles-article-footer-read-more">
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
        separator.classList.add('sc-wi-filter-results__articles-separator');
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

    that.paginationContainer.innerHTML = '';

    const totalResults = searchResults.length;
    const totalPages = Math.ceil(totalResults / that.resultsPerPage);

    if (totalPages <= 1) {
      that.paginationContainer.classList.add('hidden');
      return;
    }

    // Previous button.
    const prevButton = document.createElement('button');

    prevButton.classList.add('sc-wi-filter-results__pagination-prev');
    prevButton.textContent = this.prevButtonLabel;

    if (that.currentPage === 1) {
      prevButton.classList.add('sc-wi-filter-results__pagination-prev-inactive');
    }

    prevButton.addEventListener('click', () => {
      if (that.currentPage > 1) {
        that.currentPage--;
        that.update_pagination_and_content(searchResults);
      }
    });

    that.paginationContainer.appendChild(prevButton);

    // Pagination number buttons.
    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement('button');

      pageButton.classList.add('sc-wi-filter-results__pagination-number');

      if (i === that.currentPage) {
        pageButton.classList.add('sc-wi-filter-results__pagination-number-active');
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

    nextButton.classList.add('sc-wi-filter-results__pagination-next');
    nextButton.textContent = this.nextButtonLabel;

    if (that.currentPage === totalPages) {
      nextButton.classList.add('sc-wi-filter-results__pagination-next-inactive');
    }

    nextButton.addEventListener('click', () => {
      if (that.currentPage < totalPages) {
        that.currentPage++;
        that.update_pagination_and_content(searchResults);
      }
    });

    that.paginationContainer.appendChild(nextButton);

    if (that.paginationContainer.classList.contains('hidden')) {
      that.paginationContainer.classList.remove('hidden');
    }
  }

  // Handle history and set/update filter param in URL.
  handle_url_param_update(param_to_update) {
    if (!param_to_update) {
      return;
    }

    const url = new URL(window.location.href);

    url.searchParams.set('filter', param_to_update);

    // Replace current URL in browser history with new structure.
    window.history.replaceState(null, '', url.toString());
  }

  handle_no_results_found() {
    // Let's create new element for No results container view.
    this.noResultsContainer.className = 'sc-wi-filter-results__no-results-box';
    this.noResultsContainer.innerHTML = `
      <div class="sc-wi-filter-results__no-results-box-wrapper">
        <div class="sc-wi-filter-results__no-results-box-svg">
          <img
            src="${this?.filter_no_results_svg}"
            title="${this?.filter_no_results_heading}"
            alt="${this?.filter_no_results_heading}"
          >
        </div>
        <div class="sc-wi-filter-results__no-results-box-text">
            <div class="sc-wi-filter-results__no-results-box-heading">
                ${this?.filter_no_results_heading}
            filter
            <div class="sc-wi-filter-results__no-results-box-message">
                ${this?.filter_no_results_message}
            </div>
        </div>
      </div>
    `;

    this?.articlesContainer.classList.add('hidden');
    this?.paginationContainer.classList.add('hidden');

    this?.articlesContainer.insertAdjacentElement('afterend', this?.noResultsContainer);

    // Trigger a reflow to enable smooth transition and show noResultsContainer.
    void this?.noResultsContainer.offsetWidth;
    this?.noResultsContainer.classList.add('show');
  }

  handle_article_population() {
    const l1_filter_element = document.querySelector(
      '.sc-wi-filter-results__dropdown-click-l1 .sc-wi-filter-results__dropdown-placeholder'
    );
    const l2_filter_element = document.querySelector(
      '.sc-wi-filter-results__dropdown-click-l2 .sc-wi-filter-results__dropdown-placeholder'
    );
    const data_slug_l1 = l1_filter_element.getAttribute('data-slug');
    const data_slug_l2 = l2_filter_element.getAttribute('data-slug');

    this.search_in_json(data_slug_l1, data_slug_l2);
    this.update_pagination_and_content(this.searchResults);
    this.handle_url_param_update(data_slug_l2);
    this.slide_back_to_main_articles_section();
  }

  handle_search_cta(status = true) {
    const search_cta = document.querySelector('.sc-wi-filter-results__button');

    if (status) {
      search_cta.classList.add('active');
      search_cta.addEventListener('click', this.handle_article_population);

      return;
    }

    search_cta.classList.remove('active');
    search_cta.removeEventListener('click', this.handle_article_population);
  }

  handle_revert_no_results_found() {
    let that = this;

    // Reset no results container if it exists
    if (that.noResultsContainer) {
      that.noResultsContainer.remove();
      that.noResultsContainer = document.createElement('div');
    }

    that.articlesContainer.classList.remove('hidden');
    that.paginationContainer.classList.remove('hidden');
  }

  slide_back_to_main_articles_section(scroll_flag = true) {
    if (!scroll_flag) {
      return;
    }

    const scroll_here = document.querySelector('.sc-wi-filter-results__slide-back-here');

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
        this.popularArticlesContainer.classList.add('sc-wi-filter-results__no-results');
        this.popular_articles_view_more_button.textContent = this.popular_articles_view_more_label;
      } else {
        this.popularArticlesContainer.classList.remove('sc-wi-filter-results__no-results');
        this.popular_articles_view_more_button.textContent = this.popular_articles_view_less_label;
      }
    };

    // If article count is zero we need to revert the articles section toggle status to default.
    if (main_articles_count === 0) {
      if (!this.popularArticlesContainer.classList.contains('sc-wi-filter-results__no-results')) {
        toggle_popular_articles_container_class(true);
      } else {
        // TODO: This else section makes popular articles toggle if no filter results are found.
        toggle_popular_articles_container_class(false);
      }

      return;
    }

    // We will take care of articles defined cases in this logic section.
    if (main_articles_count > 0 && main_articles_count <= 4) {
      if (!this.popularArticlesContainer.classList.contains('sc-wi-filter-results__no-results')) {
        toggle_popular_articles_container_class(true);
      }
    } else if (main_articles_count > 4) {
      if (this.popularArticlesContainer.classList.contains('sc-wi-filter-results__no-results')) {
        toggle_popular_articles_container_class(false);
      }
    }
  }

  update_article_counter(counter = 0) {
    const resultsCounter = document.querySelector('.sc-wi-filter-results__result-counter');
    resultsCounter.classList.add('updating');

    setTimeout(() => {
      resultsCounter.textContent = counter;

      resultsCounter.classList.remove('updating');
    }, 500);
  }

  update_pagination_and_content(search_results = []) {
    const number_of_results = search_results.length;

    if (number_of_results > 0) {
      const start = (this?.currentPage - 1) * this?.resultsPerPage;
      const end = start + this?.resultsPerPage;
      const paginated_results = search_results.slice(start, end);

      this?.update_article_counter(number_of_results);
      this?.toggle_popular_articles_section(number_of_results);
      this?.generate_articles(paginated_results);
      this?.generate_pagination(search_results);
      this?.slide_back_to_main_articles_section();

      if (document.querySelector('.sc-wi-filter-results__no-results-box.show')) {
        this?.handle_revert_no_results_found();
      }
    } else {
      this?.handle_no_results_found();
      this?.toggle_popular_articles_section();
    }
  }

  keep_this_selected_in_dropdown(filter_level = '', option_to_select = '') {
    if (!filter_level || !option_to_select) {
      return;
    }

    // Select all <li> elements in the dropdown
    const dropdown_options = document.querySelectorAll(
      `.sc-wi-filter-results__dropdown-options-${filter_level} .sc-wi-filter-results__dropdown-option`
    );

    if (!dropdown_options) {
      return;
    }

    dropdown_options.forEach(option => {
      const child_element = option.querySelector('.sc-wi-filter-results__dropdown-option-text');
      const child_slug = child_element.getAttribute('data-slug');

      if (child_slug) {
        if (option_to_select === child_slug) {
          let element = document.querySelector(
            `.sc-wi-filter-results__dropdown-click-${filter_level} .sc-wi-filter-results__dropdown-placeholder`
          );

          element.textContent = child_element.innerText.trim();
          element.setAttribute('data-slug', child_slug);
        }
      }
    });
  }

  // Populate Level 2 filters dropdown.
  populate_l2_filters(selected_option_element) {
    if (!selected_option_element) {
      return;
    }

    const l2_filters = JSON.parse(selected_option_element.getAttribute('data-l2'));
    const l2_filters_dropdown = document.querySelector(
      '.sc-wi-filter-results__dropdown-options-l2'
    );

    if (!l2_filters || !l2_filters_dropdown) {
      return;
    }

    // Update placeholder text.
    document.querySelector(
      '.sc-wi-filter-results__dropdown-click-l2 .sc-wi-filter-results__dropdown-placeholder'
    ).innerText = this.l2_filter_placeholder;

    if (l2_filters.length > 0) {
      const fragment = document.createDocumentFragment();

      l2_filters.forEach(option => {
        const li = document.createElement('li');
        li.className = 'sc-wi-filter-results__dropdown-option';

        const span = document.createElement('span');
        span.className = 'sc-wi-filter-results__dropdown-option-text';
        span.textContent = option?.name;
        span.setAttribute('data-slug', option?.slug);

        li.appendChild(span);
        fragment.appendChild(li);
      });

      // Clear existing content and append the fragment
      l2_filters_dropdown.innerHTML = '';
      l2_filters_dropdown.appendChild(fragment);
    }
  }

  // Upon page load, if there is any child filter slug present in URL, we will load resuts based on it.
  check_and_load_filter_results() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const l2_filter_slug = params.get('filter');

    if (l2_filter_slug?.length > 0) {
      const l1_filter_text = document.querySelector(
        `.sc-wi-filter-results__dropdown-click-l1 .sc-wi-filter-results__dropdown-placeholder`
      );

      const l1_dropdown_options = document.querySelector(
        '.sc-wi-filter-results__dropdown-options-l1'
      );

      if (!l1_filter_text || !l1_dropdown_options) {
        return;
      }

      // Iterate over each l1 filter element.
      l1_dropdown_options
        .querySelectorAll('.sc-wi-filter-results__dropdown-option')
        .forEach(l1_dropdown_option => {
          // Get the data-l2 attribute
          const childrens_of_l1_filters = l1_dropdown_option.querySelector(
            '.sc-wi-filter-results__dropdown-option-text'
          );
          const l2_options = childrens_of_l1_filters.getAttribute('data-l2');
          const l2_filter_options = JSON.parse(l2_options);

          // Check if slug passed via param for l2_filter_slug exists in l2_filter_options
          if (l2_filter_options.some(option => option.slug === l2_filter_slug)) {
            // Get L1 filter option element to extract slug and text.
            let selectedOption = l1_dropdown_option.querySelector(
              '.sc-wi-filter-results__dropdown-option-text'
            );

            // Select default in L1 filter.
            l1_filter_text.innerText = selectedOption.innerText.trim();
            l1_filter_text.setAttribute('data-slug', selectedOption.dataset.slug);

            const filters_l1_wrapper = document.querySelector('.sc-wi-filter-results__filters-l1');

            if (filters_l1_wrapper) {
              this.populate_l2_filters(childrens_of_l1_filters);
              this.keep_this_selected_in_dropdown('l2', l2_filter_slug);
              this.handle_search_cta(true);
              this.handle_article_population();
            }
          }
        });
    } else {
      this.handle_no_results_found();
      this?.toggle_popular_articles_section();
      this?.slide_back_to_main_articles_section();
    }
  }

  // -------- Event Listeners Section -------- //
  add_event_to_filters_dropdown_wrapper(filter_level = '', filter_main_wrapper = '') {
    if (!filter_level || !filter_main_wrapper) {
      return;
    }

    const filter_select_click_area = document.querySelector(
      `.sc-wi-filter-results__dropdown-click-${filter_level}`
    );

    if (!filter_select_click_area) {
      return;
    }

    filter_select_click_area.addEventListener('click', () => {
      filter_main_wrapper.classList.toggle('active');
    });

    // If focus is moving outside filter_main_wrapper.
    filter_select_click_area.addEventListener('focusout', event => {
      if (!filter_main_wrapper.contains(event.relatedTarget)) {
        filter_main_wrapper.classList.remove('active');
      }
    });
  }

  // Add click event for parent element as child elements are dynamic - Event delegation.
  add_event_to_child_elements_of_filter(filter_level = '', filter_main_wrapper = '') {
    if (!filter_level || !filter_main_wrapper) {
      return;
    }

    const filter_options = document.querySelectorAll(
      `.sc-wi-filter-results__dropdown-options-${filter_level}`
    );
    const filter_text = document.querySelector(
      `.sc-wi-filter-results__dropdown-click-${filter_level} .sc-wi-filter-results__dropdown-placeholder`
    );

    if (!filter_options.length || !filter_text) {
      return;
    }

    let that = this;

    filter_options.forEach(option => {
      option.addEventListener('click', function(event) {
        if (event.target && event.target.closest('li')) {
          const liElement = event.target.closest('li');
          const selected_option = liElement.querySelector(
            '.sc-wi-filter-results__dropdown-option-text'
          );

          if (!selected_option) {
            return;
          }

          filter_text.innerText = selected_option.innerText.trim();
          filter_text.setAttribute('data-slug', selected_option.dataset.slug);
          filter_main_wrapper.classList.remove('active');

          // If filter is L2 then set button status as active else inactive.
          that.handle_search_cta(filter_level === 'l2');

          if (filter_level === 'l1') {
            that.populate_l2_filters(selected_option);
          }
        }
      });
    });
  }

  add_event_to_popular_articles_cta() {
    if (this?.popular_articles_view_more_button) {
      this?.popular_articles_view_more_button.addEventListener('click', () => {
        this?.toggle_popular_articles_section();
      });
    }
  }

  add_event_on_filter_wrappers() {
    const filters_l1_wrapper = document.querySelector('.sc-wi-filter-results__filters-l1');
    const filters_l2_wrapper = document.querySelector('.sc-wi-filter-results__filters-l2');

    if (filters_l1_wrapper) {
      this?.add_event_to_filters_dropdown_wrapper('l1', filters_l1_wrapper);
      this?.add_event_to_child_elements_of_filter('l1', filters_l1_wrapper);
    }

    if (filters_l2_wrapper) {
      this?.add_event_to_filters_dropdown_wrapper('l2', filters_l2_wrapper);
      this?.add_event_to_child_elements_of_filter('l2', filters_l2_wrapper);
    }
  }

  add_event_listeners() {
    this?.add_event_on_filter_wrappers();
    this?.add_event_to_popular_articles_cta();
  }
}

// Create an instance of WI_Filter_Results_Page
const instance = new WI_Filter_Results_Page();
instance.init();
export default instance;
